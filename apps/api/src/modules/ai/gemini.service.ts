import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
  error?: { message?: string };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly intentModel: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') || '';
    this.model = this.config.get<string>('GEMINI_MODEL') || 'gemini-3.1-flash-lite-preview';
    this.intentModel = this.config.get<string>('GEMINI_INTENT_MODEL') || this.model;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey?.trim());
  }

  getConfig() {
    return {
      configured: this.isConfigured(),
      model: this.model,
      intentModel: this.intentModel,
    };
  }

  private fallbackModels(preferred: string): string[] {
    const chain = [
      preferred,
      this.model,
      this.intentModel,
      'gemini-3.1-flash-lite',
      'gemini-3.1-flash-lite-preview',
      'gemini-2.0-flash',
    ];
    return [...new Set(chain.filter(Boolean))];
  }

  async generateText(prompt: string, options?: { model?: string; json?: boolean }): Promise<string> {
    const models = this.fallbackModels(options?.model || this.model);
    let lastError = 'Unknown Gemini error';

    for (const model of models) {
      try {
        return await this.callModel(model, prompt, options?.json);
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        const retryable = /404|not found|no longer available/i.test(lastError);
        if (!retryable) throw err;
        this.logger.warn(`Gemini model ${model} unavailable, trying next…`);
      }
    }

    throw new Error(lastError);
  }

  private async callModel(model: string, prompt: string, json?: boolean): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.75,
        topP: 0.95,
        maxOutputTokens: 8192,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as GeminiResponse;
    if (!res.ok) {
      const msg = data.error?.message || JSON.stringify(data);
      this.logger.error(`Gemini ${model} ${res.status}: ${msg}`);
      throw new Error(`Gemini API error (${res.status}): ${msg}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('Gemini returned an empty response');
    return text;
  }

  async generateJson<T = Record<string, unknown>>(prompt: string, options?: { model?: string }): Promise<T> {
    const raw = await this.generateText(prompt, { ...options, json: true });
    try {
      return JSON.parse(raw) as T;
    } catch {
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced?.[1]) return JSON.parse(fenced[1].trim()) as T;
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1)) as T;
      throw new Error('Could not parse JSON from Gemini response');
    }
  }

  async classifyIntent(userMessage: string): Promise<string> {
    if (!this.isConfigured()) return 'general';
    const prompt = `Classify this user request into exactly one label: script-generator, content-planner, task-distribution, client-analyzer, bug-analyzer, general.
Reply with only the label, nothing else.

Request: ${userMessage}`;
    try {
      const label = await this.generateText(prompt, { model: this.intentModel });
      return label.trim().toLowerCase().replace(/\s+/g, '-');
    } catch {
      return 'general';
    }
  }
}
