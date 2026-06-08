'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bot, History, Sparkles } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { FormField, SelectInput, TextArea, TextInput } from '@/components/ui/form-fields';
import { useAuth } from '@/lib/auth-context';
import { useApiData } from '@/hooks/use-api-data';
import { AiResultView } from '@/components/ai/ai-result-view';
import { api } from '@/lib/api';

type ToolId = 'script-generator' | 'content-planner' | 'task-distribution' | 'client-analyzer' | 'bug-analyzer';

interface AiStatus {
  configured: boolean;
  model: string;
  provider: string;
}

interface HistoryRow {
  id: string;
  type: string;
  status: string;
  output?: Record<string, unknown>;
  createdAt: string;
}

export default function AiPage() {
  const t = useTranslations('ai');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { token } = useAuth();
  const { data: status } = useApiData<AiStatus>('/ai/status');
  const { data: clients } = useApiData<{ data: { id: string; companyName: string }[] }>('/clients?limit=100');
  const { data: projects } = useApiData<{ data: { id: string; name: string }[] }>('/projects?limit=100');

  const [activeTool, setActiveTool] = useState<ToolId>('script-generator');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [form, setForm] = useState({
    topic: '',
    platform: 'instagram',
    tone: 'engaging',
    clientId: '',
    clientName: '',
    month: new Date().toISOString().slice(0, 7),
    goals: '',
    tasks: '',
    title: '',
    description: '',
    stackTrace: '',
    projectId: '',
  });

  const AI_TOOLS: { id: ToolId; endpoint: string; name: string; desc: string }[] = [
    { id: 'script-generator', endpoint: '/ai/script-generator', name: t('scriptGenerator'), desc: t('scriptGeneratorDesc') },
    { id: 'content-planner', endpoint: '/ai/content-planner', name: t('contentPlanner'), desc: t('contentPlannerDesc') },
    { id: 'task-distribution', endpoint: '/ai/task-distribution', name: t('taskDistribution'), desc: t('taskDistributionDesc') },
    { id: 'client-analyzer', endpoint: '/ai/client-analyzer', name: t('clientAnalyzer'), desc: t('clientAnalyzerDesc') },
    { id: 'bug-analyzer', endpoint: '/ai/bug-analyzer', name: t('bugAnalyzer'), desc: t('bugAnalyzerDesc') },
  ];

  const loadHistory = async () => {
    if (!token) return;
    const rows = await api<HistoryRow[]>('/ai/history', { token });
    setHistory(rows);
  };

  useEffect(() => {
    if (token) loadHistory();
  }, [token]);

  const buildBody = (): Record<string, unknown> => {
    const base = { locale };
    switch (activeTool) {
      case 'script-generator':
        return {
          ...base,
          topic: form.topic,
          platform: form.platform,
          tone: form.tone,
          clientName: form.clientName || clients?.data?.find((c) => c.id === form.clientId)?.companyName,
        };
      case 'content-planner':
        return {
          ...base,
          topic: form.topic,
          clientName: form.clientName || clients?.data?.find((c) => c.id === form.clientId)?.companyName,
          platform: form.platform,
          month: form.month,
          goals: form.goals,
        };
      case 'task-distribution':
        return {
          ...base,
          notes: form.topic,
          tasks: form.tasks.split('\n').map((s) => s.trim()).filter(Boolean),
        };
      case 'client-analyzer':
        return { ...base, clientId: form.clientId, topic: form.topic, clientName: form.clientName };
      case 'bug-analyzer':
        return {
          ...base,
          title: form.title || form.topic,
          description: form.description,
          stackTrace: form.stackTrace,
          projectId: form.projectId,
        };
      default:
        return base;
    }
  };

  const runTool = async () => {
    const tool = AI_TOOLS.find((x) => x.id === activeTool);
    if (!token || !tool) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api<{ output?: Record<string, unknown> } & Record<string, unknown>>(tool.endpoint, {
        method: 'POST',
        token,
        body: JSON.stringify(buildBody()),
      });
      const out = (res.output || res) as Record<string, unknown>;
      setResult(out);
      await loadHistory();
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : tc('error') });
    } finally {
      setLoading(false);
    }
  };

  const activeMeta = AI_TOOLS.find((x) => x.id === activeTool)!;

  return (
    <DashboardLayout title={t('title')} module="ai">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[var(--color-text-secondary)] max-w-2xl">{t('description')}</p>
        <div className="flex items-center gap-2">
          {status?.configured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              Gemini · {status.model}
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600">{t('notConfigured')}</span>
          )}
          <button
            type="button"
            onClick={() => { setShowHistory(!showHistory); loadHistory(); }}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium hover:border-vega-cyan"
          >
            <History className="h-3.5 w-3.5" />
            {t('history')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 space-y-2">
          {AI_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => { setActiveTool(tool.id); setResult(null); }}
              className={`w-full rounded-xl border p-4 text-start transition-all ${
                activeTool === tool.id
                  ? 'border-vega-cyan bg-vega-cyan/10'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-vega-cyan/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-vega-cyan" />
                <h3 className="font-semibold text-sm">{tool.name}</h3>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{tool.desc}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="mb-4 font-semibold">{activeMeta.name}</h2>

            <div className="space-y-3 mb-4">
              {(activeTool === 'script-generator' || activeTool === 'content-planner') && (
                <>
                  <FormField label={t('topic')}>
                    <TextInput value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} placeholder={t('topicPlaceholder')} />
                  </FormField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label={t('platform')}>
                      <SelectInput value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}>
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="youtube">YouTube</option>
                        <option value="linkedin">LinkedIn</option>
                      </SelectInput>
                    </FormField>
                    {activeTool === 'script-generator' && (
                      <FormField label={t('tone')}>
                        <TextInput value={form.tone} onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))} />
                      </FormField>
                    )}
                    {activeTool === 'content-planner' && (
                      <FormField label={t('month')}>
                        <TextInput type="month" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} />
                      </FormField>
                    )}
                  </div>
                </>
              )}

              {activeTool === 'client-analyzer' && (
                <>
                  <FormField label={t('client')}>
                    <SelectInput value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}>
                      <option value="">{t('selectClient')}</option>
                      {(clients?.data || []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                    </SelectInput>
                  </FormField>
                  <FormField label={t('extraNotes')}>
                    <TextArea value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} />
                  </FormField>
                </>
              )}

              {activeTool === 'task-distribution' && (
                <>
                  <FormField label={t('tasksList')}>
                    <TextArea
                      value={form.tasks}
                      onChange={(e) => setForm((f) => ({ ...f, tasks: e.target.value }))}
                      placeholder={t('tasksPlaceholder')}
                      rows={5}
                    />
                  </FormField>
                  <FormField label={t('extraNotes')}>
                    <TextInput value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} />
                  </FormField>
                </>
              )}

              {activeTool === 'bug-analyzer' && (
                <>
                  <FormField label={t('bugTitle')}>
                    <TextInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
                  </FormField>
                  <FormField label={t('project')}>
                    <SelectInput value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
                      <option value="">—</option>
                      {(projects?.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </SelectInput>
                  </FormField>
                  <FormField label={t('bugDescription')}>
                    <TextArea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} />
                  </FormField>
                  <FormField label={t('stackTrace')}>
                    <TextArea value={form.stackTrace} onChange={(e) => setForm((f) => ({ ...f, stackTrace: e.target.value }))} rows={4} />
                  </FormField>
                </>
              )}

              {(activeTool === 'script-generator' || activeTool === 'content-planner') && (
                <FormField label={t('client')}>
                  <SelectInput value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}>
                    <option value="">—</option>
                    {(clients?.data || []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </SelectInput>
                </FormField>
              )}

              {activeTool === 'content-planner' && (
                <FormField label={t('goals')}>
                  <TextInput value={form.goals} onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))} placeholder={t('goalsPlaceholder')} />
                </FormField>
              )}
            </div>

            <button
              type="button"
              onClick={runTool}
              disabled={loading || !status?.configured}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--vega-gradient)' }}
            >
              {loading ? t('generating') : t('run')}
            </button>
          </div>

          {result && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="font-semibold mb-3">{t('result')}</h3>
              <AiResultView data={result} />
            </div>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="font-semibold mb-3">{t('history')}</h3>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((h) => (
                <li key={h.id} className="flex justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium">{h.type}</span>
                    <span className={`ms-2 text-xs ${h.status === 'completed' ? 'text-emerald-500' : h.status === 'failed' ? 'text-vega-red' : 'text-amber-500'}`}>
                      {h.status}
                    </span>
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{new Date(h.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
