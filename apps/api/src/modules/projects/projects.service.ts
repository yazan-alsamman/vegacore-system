import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetType, Prisma, ProjectStatus, TaskPriority, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { SOFTWARE_PROJECT_PHASES } from './project-phases.const';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationDto, status?: ProjectStatus, clientId?: string) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where: Prisma.ProjectWhereInput = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, companyName: true } },
          _count: { select: { tasks: true, members: true, phases: true, issues: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        phases: {
          orderBy: { sortOrder: 'asc' },
          include: { lead: { select: { id: true, firstName: true, lastName: true } } },
        },
        milestones: true,
        sprints: { include: { _count: { select: { tasks: true } } } },
        tasks: {
          orderBy: [{ columnOrder: 'asc' }, { createdAt: 'desc' }],
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
            phase: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private calcPhaseProgress(
    phaseId: string,
    tasks: { phaseId: string | null; status: TaskStatus }[],
    manualProgress: number,
  ) {
    const phaseTasks = tasks.filter((t) => t.phaseId === phaseId);
    if (!phaseTasks.length) return manualProgress;
    const done = phaseTasks.filter((t) => t.status === TaskStatus.DONE).length;
    return Math.round((done / phaseTasks.length) * 100);
  }

  async getDashboard(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        phases: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lead: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            tasks: {
              include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
            },
            issues: {
              where: { status: { not: 'resolved' } },
              include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
            },
          },
        },
        issues: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
            phase: { select: { id: true, name: true } },
          },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
            phase: { select: { id: true, name: true, slug: true } },
          },
        },
        assets: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const allTasks = project.tasks;
    const phases = project.phases.map((ph) => ({
      ...ph,
      progress: this.calcPhaseProgress(ph.id, allTasks, ph.progress),
      taskCount: ph.tasks.length,
      openIssues: ph.issues.length,
    }));

    const overallProgress =
      phases.length > 0
        ? Math.round(phases.reduce((s, p) => s + p.progress, 0) / phases.length)
        : project.progress;

    const openIssues = project.issues.filter((i) => i.status !== 'resolved');
    const blockedTasks = allTasks.filter((t) => t.status === TaskStatus.BLOCKED);

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        template: project.template,
        progress: overallProgress,
        startDate: project.startDate,
        endDate: project.endDate,
        client: project.client,
        members: project.members,
      },
      phases,
      files: project.assets,
      issues: project.issues,
      openIssues,
      blockedTasks,
      stats: {
        totalTasks: allTasks.length,
        doneTasks: allTasks.filter((t) => t.status === TaskStatus.DONE).length,
        openIssues: openIssues.length,
        blockedTasks: blockedTasks.length,
      },
    };
  }

  async getKanban(id: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId: id },
      orderBy: { columnOrder: 'asc' },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        phase: { select: { id: true, name: true, slug: true } },
      },
    });
    const columns = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'];
    return columns.reduce(
      (acc, status) => {
        acc[status] = tasks.filter((t) => t.status === status);
        return acc;
      },
      {} as Record<string, typeof tasks>,
    );
  }

  async initSoftwarePhases(projectId: string) {
    await this.findOne(projectId);
    const existing = await this.prisma.projectPhase.count({ where: { projectId } });
    if (existing > 0) return this.getDashboard(projectId);

    await this.prisma.projectPhase.createMany({
      data: SOFTWARE_PROJECT_PHASES.map((p) => ({
        projectId,
        slug: p.slug,
        name: p.name,
        sortOrder: p.sortOrder,
        priority: p.priority,
        status: p.slug === 'ui-ux' ? 'active' : 'pending',
      })),
    });

    await this.prisma.project.update({
      where: { id: projectId },
      data: { template: 'software', phase: 'ui-ux' },
    });

    return this.getDashboard(projectId);
  }

  async create(data: {
    name: string;
    description?: string;
    clientId?: string;
    status?: ProjectStatus;
    priority?: TaskPriority;
    startDate?: string;
    endDate?: string;
    phase?: string;
    template?: string;
    initPhases?: boolean;
  }) {
    const project = await this.prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        clientId: data.clientId,
        status: data.status,
        priority: data.priority,
        template: data.template ?? 'software',
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        phase: data.phase,
      },
    });

    if (data.initPhases !== false && (data.template ?? 'software') === 'software') {
      await this.initSoftwarePhases(project.id);
    }

    return project;
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.findOne(id);
    const update: Prisma.ProjectUpdateInput = { ...data } as Prisma.ProjectUpdateInput;
    if (data.startDate) update.startDate = new Date(data.startDate as string);
    if (data.endDate) update.endDate = new Date(data.endDate as string);
    return this.prisma.project.update({ where: { id }, data: update });
  }

  async updatePhase(
    projectId: string,
    phaseId: string,
    data: {
      name?: string;
      progress?: number;
      priority?: TaskPriority;
      status?: string;
      leadId?: string | null;
      dueDate?: string | null;
      startDate?: string | null;
      notes?: string;
    },
  ) {
    const phase = await this.prisma.projectPhase.findFirst({ where: { id: phaseId, projectId } });
    if (!phase) throw new NotFoundException('Phase not found');

    const updated = await this.prisma.projectPhase.update({
      where: { id: phaseId },
      data: {
        name: data.name,
        progress: data.progress,
        priority: data.priority,
        status: data.status,
        leadId: data.leadId,
        notes: data.notes,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
        startDate: data.startDate ? new Date(data.startDate) : data.startDate === null ? null : undefined,
      },
      include: { lead: { select: { id: true, firstName: true, lastName: true } } },
    });

    await this.syncProjectProgress(projectId);
    return updated;
  }

  async createIssue(
    projectId: string,
    data: {
      title: string;
      description?: string;
      phaseId?: string;
      severity?: TaskPriority;
      status?: string;
      assigneeId?: string;
    },
  ) {
    await this.findOne(projectId);
    return this.prisma.projectIssue.create({
      data: { projectId, ...data },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        phase: { select: { id: true, name: true } },
      },
    });
  }

  async updateIssue(
    projectId: string,
    issueId: string,
    data: Partial<{
      title: string;
      description: string;
      phaseId: string | null;
      severity: TaskPriority;
      status: string;
      assigneeId: string | null;
    }>,
  ) {
    const issue = await this.prisma.projectIssue.findFirst({ where: { id: issueId, projectId } });
    if (!issue) throw new NotFoundException('Issue not found');
    return this.prisma.projectIssue.update({
      where: { id: issueId },
      data,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        phase: { select: { id: true, name: true } },
      },
    });
  }

  async removeIssue(projectId: string, issueId: string) {
    const issue = await this.prisma.projectIssue.findFirst({ where: { id: issueId, projectId } });
    if (!issue) throw new NotFoundException('Issue not found');
    await this.prisma.projectIssue.delete({ where: { id: issueId } });
    return { message: 'Issue deleted' };
  }

  async addProjectAsset(
    projectId: string,
    data: { name: string; fileUrl: string; type?: string; phaseId?: string },
  ) {
    await this.findOne(projectId);
    return this.prisma.asset.create({
      data: {
        projectId,
        name: data.name,
        fileUrl: data.fileUrl,
        type: (data.type as AssetType) || AssetType.DOCUMENT,
        metadata: data.phaseId ? ({ phaseId: data.phaseId } as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  private async syncProjectProgress(projectId: string) {
    const phases = await this.prisma.projectPhase.findMany({ where: { projectId } });
    const tasks = await this.prisma.task.findMany({ where: { projectId }, select: { phaseId: true, status: true } });
    if (!phases.length) return;
    const avg = Math.round(
      phases.reduce((s, ph) => s + this.calcPhaseProgress(ph.id, tasks, ph.progress), 0) / phases.length,
    );
    await this.prisma.project.update({ where: { id: projectId }, data: { progress: avg } });
  }

  async addMember(projectId: string, userId: string, role = 'member') {
    return this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, role },
      update: { role },
    });
  }

  async createMilestone(projectId: string, data: { title: string; description?: string; dueDate?: string }) {
    return this.prisma.milestone.create({
      data: { projectId, ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    });
  }

  async createSprint(projectId: string, data: { name: string; goal?: string; startDate: string; endDate: string }) {
    return this.prisma.sprint.create({
      data: {
        projectId,
        name: data.name,
        goal: data.goal,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.projectIssue.deleteMany({ where: { projectId: id } }),
      this.prisma.task.deleteMany({ where: { projectId: id } }),
      this.prisma.projectPhase.deleteMany({ where: { projectId: id } }),
      this.prisma.projectMember.deleteMany({ where: { projectId: id } }),
      this.prisma.milestone.deleteMany({ where: { projectId: id } }),
      this.prisma.sprint.deleteMany({ where: { projectId: id } }),
      this.prisma.project.delete({ where: { id } }),
    ]);
    return { message: 'Project deleted' };
  }
}
