import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from './gemini.service';

export type AiType =
  | 'script-generator'
  | 'content-planner'
  | 'task-distribution'
  | 'client-analyzer'
  | 'bug-analyzer';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private gemini: GeminiService,
  ) {}

  getStatus() {
    return {
      ...this.gemini.getConfig(),
      provider: 'google-gemini',
      tools: [
        'script-generator',
        'content-planner',
        'task-distribution',
        'client-analyzer',
        'bug-analyzer',
      ],
    };
  }

  async process(type: AiType, input: Record<string, unknown>, userId?: string) {
    const request = await this.prisma.aiRequest.create({
      data: { type, input: input as Prisma.InputJsonValue, userId, status: 'processing' },
    });

    try {
      if (!this.gemini.isConfigured()) {
        throw new ServiceUnavailableException(
          'Gemini API is not configured. Set GEMINI_API_KEY in apps/api/.env',
        );
      }

      const context = await this.loadContext(type, input);
      const prompt = this.buildPrompt(type, input, context);
      const output = await this.gemini.generateJson<Record<string, unknown>>(prompt);

      const updated = await this.prisma.aiRequest.update({
        where: { id: request.id },
        data: {
          output: { ...output, _meta: { model: this.gemini.getConfig().model, provider: 'gemini' } } as Prisma.InputJsonValue,
          status: 'completed',
        },
      });

      return { ...updated, output };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI processing failed';
      await this.prisma.aiRequest.update({
        where: { id: request.id },
        data: { status: 'failed', output: { error: message } as Prisma.InputJsonValue },
      });
      throw err instanceof ServiceUnavailableException || err instanceof BadRequestException
        ? err
        : new BadRequestException(message);
    }
  }

  getHistory(userId?: string, type?: string) {
    return this.prisma.aiRequest.findMany({
      where: { ...(userId && { userId }), ...(type && { type }) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        input: true,
        output: true,
        status: true,
        createdAt: true,
      },
    });
  }

  private async loadContext(type: AiType, input: Record<string, unknown>) {
    if (type === 'client-analyzer' && input.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: input.clientId as string },
        include: {
          packages: true,
          projects: { select: { id: true, name: true, status: true, progress: true }, take: 10 },
          invoices: { select: { total: true, status: true }, take: 10 },
          subscriptions: { where: { isActive: true } },
        },
      });
      return { client };
    }

    if (type === 'task-distribution') {
      const [employees, tasks] = await Promise.all([
        this.prisma.employeeProfile.findMany({
          include: {
            user: { select: { firstName: true, lastName: true, role: { select: { name: true } } } },
          },
        }),
        this.prisma.task.findMany({
          where: { status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED'] } },
          include: {
            assignee: { select: { firstName: true, lastName: true } },
            project: { select: { name: true } },
          },
          take: 30,
          orderBy: { priority: 'desc' },
        }),
      ]);
      return { employees, tasks };
    }

    if (type === 'bug-analyzer' && input.projectId) {
      const issues = await this.prisma.projectIssue.findMany({
        where: { projectId: input.projectId as string, status: { not: 'closed' } },
        take: 15,
      });
      return { issues };
    }

    return {};
  }

  private buildPrompt(type: AiType, input: Record<string, unknown>, context: Record<string, unknown>): string {
    const locale = (input.locale as string) || 'en';
    const langNote =
      locale === 'ar'
        ? 'Respond in Arabic. JSON keys must remain in English.'
        : 'Respond in English.';

    const base = `You are VegaCore OS AI assistant for a digital agency (marketing, media, software).
${langNote}
Return ONLY valid JSON (no markdown).`;

    switch (type) {
      case 'script-generator':
        return `${base}

Generate an Instagram/TikTok REEL script.

Input:
- topic: ${input.topic || 'brand awareness'}
- platform: ${input.platform || 'instagram'}
- tone: ${input.tone || 'engaging'}
- durationSeconds: ${input.durationSeconds || 60}
- clientName: ${input.clientName || 'N/A'}

JSON schema:
{
  "hook": "string (first 3 seconds)",
  "script": "string (full voiceover/narration)",
  "scenes": [{"time": "0-3s", "visual": "string", "text": "string"}],
  "cta": "string",
  "hashtags": ["string"],
  "duration": "string"
}`;

      case 'content-planner':
        return `${base}

Create a monthly content plan for a client.

Input:
- clientName: ${input.clientName || input.topic || 'Client'}
- platform: ${input.platform || 'instagram'}
- month: ${input.month || new Date().toISOString().slice(0, 7)}
- goals: ${input.goals || 'engagement and leads'}
- postsPerWeek: ${input.postsPerWeek || 5}

JSON schema:
{
  "month": "YYYY-MM",
  "summary": "string",
  "weeks": [
    {
      "week": 1,
      "items": [
        {"day": "Monday", "type": "reel|post|story", "title": "string", "idea": "string", "platform": "string"}
      ]
    }
  ],
  "kpis": ["string"]
}`;

      case 'task-distribution':
        return `${base}

Suggest smart task assignments for the team.

Team context:
${JSON.stringify(context.employees || [], null, 2)}

Pending tasks:
${JSON.stringify(context.tasks || [], null, 2)}

Additional tasks from user:
${JSON.stringify(input.tasks || [], null, 2)}

Notes: ${input.notes || 'none'}

JSON schema:
{
  "summary": "string",
  "assignments": [
    {
      "taskTitle": "string",
      "assigneeName": "string",
      "reason": "string",
      "priority": "LOW|MEDIUM|HIGH|URGENT",
      "estimatedHours": number
    }
  ],
  "risks": ["string"],
  "recommendations": ["string"]
}`;

      case 'client-analyzer':
        return `${base}

Analyze client health and upsell opportunities.

Client data:
${JSON.stringify(context.client || { name: input.clientName, notes: input.topic }, null, 2)}

JSON schema:
{
  "healthScore": number,
  "summary": "string",
  "strengths": ["string"],
  "risks": ["string"],
  "insights": ["string"],
  "recommendedServices": [{"service": "string", "reason": "string", "priority": "high|medium|low"}],
  "nextActions": ["string"]
}`;

      case 'bug-analyzer':
        return `${base}

Analyze a software bug for developers.

Input:
- title: ${input.title || input.topic || 'Bug'}
- description: ${input.description || input.error || ''}
- stackTrace: ${input.stackTrace || 'N/A'}
- environment: ${input.environment || 'production'}

Open issues in project:
${JSON.stringify(context.issues || [], null, 2)}

JSON schema:
{
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "summary": "string",
  "rootCause": "string",
  "fixSteps": ["string"],
  "affectedAreas": ["string"],
  "prevention": ["string"],
  "codeSnippet": "string or null"
}`;

      default:
        throw new BadRequestException('Unknown AI tool type');
    }
  }
}
