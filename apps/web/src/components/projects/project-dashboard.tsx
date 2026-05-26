'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Calendar, FileText, Layers, LayoutGrid, User } from 'lucide-react';
import { CrudActions } from '@/components/admin/crud-actions';
import { Modal } from '@/components/ui/modal';
import { FormField, TextInput, SelectInput, TextArea, FormActions } from '@/components/ui/form-fields';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api';

type Tab = 'phases' | 'kanban' | 'files' | 'issues';

interface Phase {
  id: string;
  name: string;
  slug: string;
  progress: number;
  priority: string;
  status: string;
  dueDate?: string;
  taskCount: number;
  openIssues: number;
  lead?: { id: string; firstName: string; lastName: string };
  issues?: { id: string; title: string; severity: string }[];
}

interface DashboardData {
  project: Record<string, unknown>;
  phases: Phase[];
  files: Record<string, unknown>[];
  issues: Record<string, unknown>[];
  openIssues: Record<string, unknown>[];
  blockedTasks: Record<string, unknown>[];
  stats: { totalTasks: number; doneTasks: number; openIssues: number; blockedTasks: number };
}

const KANBAN_COLS = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'];

function fmtDate(v: unknown) {
  if (!v) return '—';
  return new Date(String(v)).toLocaleDateString();
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === 'URGENT'
      ? 'bg-vega-red/15 text-vega-red'
      : priority === 'HIGH'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
        : priority === 'LOW'
          ? 'bg-vega-navy/10 text-vega-navy dark:text-vega-cyan'
          : 'bg-vega-cyan/15 text-vega-cyan';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>{priority}</span>;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-[var(--color-surface-secondary)]">
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${Math.min(100, value)}%`, background: 'var(--vega-gradient)' }}
      />
    </div>
  );
}

export function ProjectDashboard({
  projectId,
  data,
  kanban,
  users,
  token,
  onRefresh,
}: {
  projectId: string;
  data: DashboardData;
  kanban: Record<string, Record<string, unknown>[]> | null;
  users: { id: string; firstName: string; lastName: string }[];
  token: string | null;
  onRefresh: () => void;
}) {
  const t = useTranslations('common');
  const tp = useTranslations('projectDetail');
  const tt = useTranslations('tasks');
  const tk = useTranslations('kanban');
  const { canUpdate, canCreate } = usePermissions();
  const [tab, setTab] = useState<Tab>('phases');

  const project = data.project;
  const client = project.client as { companyName?: string } | undefined;

  const [phaseModal, setPhaseModal] = useState<Phase | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [phaseForm, setPhaseForm] = useState({
    progress: '0',
    priority: 'MEDIUM',
    status: 'pending',
    leadId: '',
    dueDate: '',
    notes: '',
  });

  const [issueForm, setIssueForm] = useState({
    title: '',
    description: '',
    phaseId: '',
    severity: 'MEDIUM',
    assigneeId: '',
  });

  const [fileForm, setFileForm] = useState({ name: '', fileUrl: '', phaseId: '' });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    phaseId: '',
    priority: 'MEDIUM',
    assigneeId: '',
  });

  const openPhaseEdit = (ph: Phase) => {
    setPhaseForm({
      progress: String(ph.progress),
      priority: ph.priority,
      status: ph.status,
      leadId: ph.lead?.id || '',
      dueDate: ph.dueDate ? String(ph.dueDate).slice(0, 10) : '',
      notes: '',
    });
    setPhaseModal(ph);
  };

  const savePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !phaseModal) return;
    setSaving(true);
    try {
      await api(`/projects/${projectId}/phases/${phaseModal.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          progress: Number(phaseForm.progress),
          priority: phaseForm.priority,
          status: phaseForm.status,
          leadId: phaseForm.leadId || null,
          dueDate: phaseForm.dueDate || null,
          notes: phaseForm.notes || undefined,
        }),
      });
      setPhaseModal(null);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  const saveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await api(`/projects/${projectId}/issues`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: issueForm.title,
          description: issueForm.description || undefined,
          phaseId: issueForm.phaseId || undefined,
          severity: issueForm.severity,
          assigneeId: issueForm.assigneeId || undefined,
        }),
      });
      setIssueOpen(false);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  const saveFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await api(`/projects/${projectId}/files`, {
        method: 'POST',
        token,
        body: JSON.stringify(fileForm),
      });
      setFileOpen(false);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await api('/tasks', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description || undefined,
          projectId,
          phaseId: taskForm.phaseId || undefined,
          priority: taskForm.priority,
          assigneeId: taskForm.assigneeId || undefined,
          status: 'TODO',
        }),
      });
      setTaskOpen(false);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  const initPhases = async () => {
    if (!token) return;
    await api(`/projects/${projectId}/phases/init-software`, { method: 'POST', token });
    onRefresh();
  };

  const deleteIssue = async (issueId: string) => {
    if (!token || !confirm(t('deleteConfirm'))) return;
    await api(`/projects/${projectId}/issues/${issueId}`, { method: 'DELETE', token });
    onRefresh();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'phases', label: tp('tabPhases'), icon: <Layers className="h-4 w-4" /> },
    { id: 'kanban', label: tp('tabKanban'), icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'files', label: tp('tabFiles'), icon: <FileText className="h-4 w-4" /> },
    { id: 'issues', label: tp('tabIssues'), icon: <AlertTriangle className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/projects" className="text-sm text-vega-cyan hover:underline">
            ← {tp('backToProjects')}
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-vega-navy dark:text-white">{String(project.name)}</h2>
          {client?.companyName && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              {tp('client')}: {client.companyName}
            </p>
          )}
          {project.description != null && String(project.description) !== '' && (
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">{String(project.description)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <PriorityBadge priority={String(project.priority)} />
          <span className="rounded-full bg-vega-navy/10 px-3 py-1 text-xs font-semibold text-vega-navy dark:bg-vega-cyan/15 dark:text-vega-cyan">
            {String(project.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={tp('overallProgress')} value={`${project.progress}%`}>
          <ProgressBar value={Number(project.progress)} />
        </StatCard>
        <StatCard label={tp('deadline')} value={fmtDate(project.endDate)} icon={<Calendar className="h-4 w-4" />} />
        <StatCard label={tp('tasksDone')} value={`${data.stats.doneTasks}/${data.stats.totalTasks}`} />
        <StatCard
          label={tp('openIssues')}
          value={String(data.stats.openIssues)}
          alert={data.stats.openIssues > 0}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-1">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === tb.id
                ? 'bg-vega-navy text-white dark:bg-vega-cyan dark:text-vega-navy'
                : 'text-[var(--color-text-secondary)] hover:bg-vega-navy/5'
            }`}
          >
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'phases' && (
        <>
          {data.phases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
              <p className="mb-4 text-[var(--color-text-secondary)]">{tp('noPhases')}</p>
              {canUpdate('projects') && (
                <button
                  type="button"
                  onClick={initPhases}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: 'var(--vega-gradient)' }}
                >
                  {tp('initSoftwarePhases')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.phases.map((ph) => (
                <div
                  key={ph.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm hover:border-vega-cyan/30 transition-colors"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-vega-navy dark:text-white">{ph.name}</h3>
                      <p className="text-xs text-[var(--color-text-secondary)] capitalize">{ph.status}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <PriorityBadge priority={ph.priority} />
                      {canUpdate('projects') && (
                        <button
                          type="button"
                          onClick={() => openPhaseEdit(ph)}
                          className="text-xs text-vega-cyan hover:underline ms-1"
                        >
                          {t('edit')}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{tp('progress')}</span>
                      <span className="font-semibold">{ph.progress}%</span>
                    </div>
                    <ProgressBar value={ph.progress} />
                  </div>

                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                      <dt className="text-[var(--color-text-secondary)]">{tp('lead')}:</dt>
                      <dd className="font-medium">
                        {ph.lead ? `${ph.lead.firstName} ${ph.lead.lastName}` : tp('unassigned')}
                      </dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                      <dt className="text-[var(--color-text-secondary)]">{tp('deadline')}:</dt>
                      <dd>{fmtDate(ph.dueDate)}</dd>
                    </div>
                    <div className="flex justify-between pt-1 text-xs">
                      <span>{tp('tasks')}: {ph.taskCount}</span>
                      <span className={ph.openIssues > 0 ? 'text-vega-red font-medium' : ''}>
                        {tp('issues')}: {ph.openIssues}
                      </span>
                    </div>
                  </dl>

                  {ph.issues && ph.issues.length > 0 && (
                    <div className="mt-3 rounded-lg bg-vega-red/5 border border-vega-red/20 p-2">
                      <p className="text-[10px] font-semibold uppercase text-vega-red mb-1">{tp('currentIssues')}</p>
                      <ul className="text-xs space-y-1">
                        {ph.issues.slice(0, 2).map((iss) => (
                          <li key={iss.id} className="truncate">• {iss.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'kanban' && (
        <div>
          {canCreate('tasks') && (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setTaskOpen(true)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--vega-gradient)' }}
              >
                + {tt('addTask')}
              </button>
            </div>
          )}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLS.map((col) => (
              <div key={col} className="min-w-[260px] flex-shrink-0">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">{tk(col as 'TODO')}</h3>
                  <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-xs">
                    {kanban?.[col]?.length || 0}
                  </span>
                </div>
                <div className="space-y-2">
                  {(kanban?.[col] || []).map((task) => {
                    const tsk = task as {
                      id: string;
                      title: string;
                      priority: string;
                      assignee?: { firstName: string; lastName: string };
                      phase?: { name: string };
                    };
                    return (
                      <div
                        key={tsk.id}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm"
                      >
                        <p className="text-sm font-medium">{tsk.title}</p>
                        {tsk.phase && (
                          <span className="mt-1 inline-block rounded bg-vega-navy/10 px-1.5 py-0.5 text-[10px] text-vega-navy dark:text-vega-cyan">
                            {tsk.phase.name}
                          </span>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <PriorityBadge priority={tsk.priority} />
                          {tsk.assignee && (
                            <span className="text-xs text-[var(--color-text-secondary)]">
                              {tsk.assignee.firstName[0]}
                              {tsk.assignee.lastName[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'files' && (
        <div>
          {canUpdate('projects') && (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setFileOpen(true)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--vega-gradient)' }}
              >
                + {tp('addFile')}
              </button>
            </div>
          )}
          {data.files.length === 0 ? (
            <p className="text-center py-8 text-[var(--color-text-secondary)]">{t('noData')}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.files.map((f) => (
                <li key={String(f.id)} className="rounded-lg border border-[var(--color-border)] p-4 flex gap-3">
                  <FileText className="h-8 w-8 text-vega-cyan shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{String(f.name)}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{String(f.type)}</p>
                    {f.fileUrl != null && String(f.fileUrl) !== '' && String(f.fileUrl) !== '#' && (
                      <a href={String(f.fileUrl)} className="text-xs text-vega-cyan hover:underline mt-1 inline-block">
                        {tp('openFile')}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'issues' && (
        <div>
          {canUpdate('projects') && (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIssueOpen(true)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--vega-gradient)' }}
              >
                + {tp('addIssue')}
              </button>
            </div>
          )}
          {data.issues.length === 0 ? (
            <p className="text-center py-8 text-[var(--color-text-secondary)]">{t('noData')}</p>
          ) : (
            <ul className="space-y-3">
              {data.issues.map((iss) => {
                const issue = iss as {
                  id: string;
                  title: string;
                  description?: string;
                  severity: string;
                  status: string;
                  phase?: { name: string };
                  assignee?: { firstName: string; lastName: string };
                };
                return (
                  <li
                    key={issue.id}
                    className={`rounded-lg border p-4 ${
                      issue.status === 'resolved'
                        ? 'border-[var(--color-border)] opacity-60'
                        : 'border-vega-red/25 bg-vega-red/5'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <PriorityBadge priority={issue.severity} />
                          <span className="text-xs uppercase text-[var(--color-text-secondary)]">{issue.status}</span>
                          {issue.phase && (
                            <span className="text-xs rounded bg-vega-navy/10 px-1.5 py-0.5">{issue.phase.name}</span>
                          )}
                        </div>
                        <p className="font-medium">{issue.title}</p>
                        {issue.description && (
                          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{issue.description}</p>
                        )}
                        {issue.assignee && (
                          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                            {tp('lead')}: {issue.assignee.firstName} {issue.assignee.lastName}
                          </p>
                        )}
                      </div>
                      {canUpdate('projects') && issue.status !== 'resolved' && (
                        <CrudActions module="projects" onDelete={() => deleteIssue(issue.id)} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <Modal open={!!phaseModal} onClose={() => setPhaseModal(null)} title={tp('editPhase')}>
        <form onSubmit={savePhase} className="space-y-4">
          <FormField label={tp('progress')}>
            <TextInput type="number" min={0} max={100} value={phaseForm.progress} onChange={(e) => setPhaseForm({ ...phaseForm, progress: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={tt('priority')}>
              <SelectInput value={phaseForm.priority} onChange={(e) => setPhaseForm({ ...phaseForm, priority: e.target.value })}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </SelectInput>
            </FormField>
            <FormField label={tp('phaseStatus')}>
              <SelectInput value={phaseForm.status} onChange={(e) => setPhaseForm({ ...phaseForm, status: e.target.value })}>
                <option value="pending">pending</option>
                <option value="active">active</option>
                <option value="completed">completed</option>
                <option value="blocked">blocked</option>
              </SelectInput>
            </FormField>
          </div>
          <FormField label={tp('lead')}>
            <SelectInput value={phaseForm.leadId} onChange={(e) => setPhaseForm({ ...phaseForm, leadId: e.target.value })}>
              <option value="">{tp('unassigned')}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label={tp('deadline')}>
            <TextInput type="date" value={phaseForm.dueDate} onChange={(e) => setPhaseForm({ ...phaseForm, dueDate: e.target.value })} />
          </FormField>
          <FormActions onCancel={() => setPhaseModal(null)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>

      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title={tp('addIssue')}>
        <form onSubmit={saveIssue} className="space-y-4">
          <FormField label={tp('issueTitle')} required>
            <TextInput value={issueForm.title} onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })} required />
          </FormField>
          <FormField label={tp('issueDesc')}>
            <TextArea value={issueForm.description} onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })} />
          </FormField>
          <FormField label={tp('phase')}>
            <SelectInput value={issueForm.phaseId} onChange={(e) => setIssueForm({ ...issueForm, phaseId: e.target.value })}>
              <option value="">—</option>
              {data.phases.map((ph) => (
                <option key={ph.id} value={ph.id}>
                  {ph.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormActions onCancel={() => setIssueOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>

      <Modal open={fileOpen} onClose={() => setFileOpen(false)} title={tp('addFile')}>
        <form onSubmit={saveFile} className="space-y-4">
          <FormField label={tp('fileName')} required>
            <TextInput value={fileForm.name} onChange={(e) => setFileForm({ ...fileForm, name: e.target.value })} required />
          </FormField>
          <FormField label={tp('fileUrl')} required>
            <TextInput value={fileForm.fileUrl} onChange={(e) => setFileForm({ ...fileForm, fileUrl: e.target.value })} required />
          </FormField>
          <FormField label={tp('phase')}>
            <SelectInput value={fileForm.phaseId} onChange={(e) => setFileForm({ ...fileForm, phaseId: e.target.value })}>
              <option value="">—</option>
              {data.phases.map((ph) => (
                <option key={ph.id} value={ph.id}>
                  {ph.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormActions onCancel={() => setFileOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>

      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title={tt('addTask')}>
        <form onSubmit={saveTask} className="space-y-4">
          <FormField label={tt('titleCol')} required>
            <TextInput value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
          </FormField>
          <FormField label={tp('phase')}>
            <SelectInput value={taskForm.phaseId} onChange={(e) => setTaskForm({ ...taskForm, phaseId: e.target.value })}>
              <option value="">—</option>
              {data.phases.map((ph) => (
                <option key={ph.id} value={ph.id}>
                  {ph.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormActions onCancel={() => setTaskOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </div>
  );
}

function StatCard({
  label,
  value,
  children,
  icon,
  alert,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        alert ? 'border-vega-red/30 bg-vega-red/5' : 'border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {icon}
        <p className={`text-xl font-bold ${alert ? 'text-vega-red' : 'text-vega-navy dark:text-white'}`}>{value}</p>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
