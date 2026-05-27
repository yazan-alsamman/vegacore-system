import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type CalendarEventType = 'SHOOT' | 'REEL_PUBLISH' | 'DELIVERY' | 'MEETING';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  description?: string;
  start: string;
  end?: string;
  allDay: boolean;
  link?: string;
  status?: string;
}

interface AuthUser {
  id: string;
  permissions: string[];
}

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  private can(permissions: string[], slug: string) {
    return permissions.includes('*') || permissions.includes(slug);
  }

  private range(from?: string, to?: string) {
    const now = new Date();
    const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = to
      ? new Date(to)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    if (!to) end.setHours(23, 59, 59, 999);
    else end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async getEvents(user: AuthUser, from?: string, to?: string) {
    const { start, end } = this.range(from, to);
    const { id: userId, permissions } = user;
    const events: CalendarEvent[] = [];

    const modelProfile = await this.prisma.modelProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const memberProjectIds = (
      await this.prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      })
    ).map((m) => m.projectId);

    const bookingInclude = {
      shoot: { select: { id: true, title: true, location: true } },
      model: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
    };

    const bookingRange = {
      startTime: { lte: end },
      endTime: { gte: start },
    };

    const bookingList = modelProfile
      ? await this.prisma.modelBooking.findMany({
          where: { ...bookingRange, modelId: modelProfile.id },
          include: bookingInclude,
        })
      : this.can(permissions, 'models.read')
        ? await this.prisma.modelBooking.findMany({
            where: bookingRange,
            include: bookingInclude,
          })
        : [];

    const [
      tasks,
      shootsMedia,
      contentAssigned,
      contentModel,
      phases,
      milestones,
      projects,
      meetingsOrganized,
      meetingsAttending,
    ] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          assigneeId: userId,
          dueDate: { gte: start, lte: end },
          status: { not: 'DONE' },
        },
        include: { project: { select: { id: true, name: true } } },
      }),
      this.can(permissions, 'media.read')
        ? this.prisma.shoot.findMany({
            where: { scheduledAt: { gte: start, lte: end } },
            include: { project: { select: { name: true } } },
          })
        : Promise.resolve([]),
      this.prisma.contentCalendar.findMany({
        where: {
          publishDate: { gte: start, lte: end },
          OR: [{ editorId: userId }, { photographerId: userId }],
        },
      }),
      modelProfile
        ? this.prisma.contentCalendar.findMany({
            where: {
              modelId: modelProfile.id,
              publishDate: { gte: start, lte: end },
            },
          })
        : Promise.resolve([]),
      this.prisma.projectPhase.findMany({
        where: {
          leadId: userId,
          dueDate: { gte: start, lte: end },
        },
        include: { project: { select: { id: true, name: true } } },
      }),
      memberProjectIds.length
        ? this.prisma.milestone.findMany({
            where: {
              projectId: { in: memberProjectIds },
              dueDate: { gte: start, lte: end },
              completedAt: null,
            },
            include: { project: { select: { id: true, name: true } } },
          })
        : Promise.resolve([]),
      memberProjectIds.length
        ? this.prisma.project.findMany({
            where: {
              id: { in: memberProjectIds },
              endDate: { gte: start, lte: end },
              status: { notIn: ['COMPLETED', 'CANCELLED', 'ARCHIVED'] },
            },
          })
        : Promise.resolve([]),
      this.prisma.meeting.findMany({
        where: {
          organizerId: userId,
          startTime: { lte: end },
          endTime: { gte: start },
        },
      }),
      this.prisma.meetingAttendee.findMany({
        where: {
          userId,
          meeting: { startTime: { lte: end }, endTime: { gte: start } },
        },
        include: { meeting: true },
      }),
    ]);

    for (const t of tasks) {
      events.push({
        id: `task:${t.id}`,
        type: 'DELIVERY',
        title: t.title,
        description: t.project ? `Project: ${t.project.name}` : undefined,
        start: t.dueDate!.toISOString(),
        allDay: true,
        link: t.projectId ? `/projects/${t.projectId}` : '/tasks',
        status: t.status,
      });
    }

    for (const b of bookingList) {
      const modelName = b.model?.user
        ? `${b.model.user.firstName} ${b.model.user.lastName}`.trim()
        : '';
      const sessionTitle = b.shoot?.title || b.notes || 'Photoshoot session';
      events.push({
        id: `booking:${b.id}`,
        type: 'SHOOT',
        title: modelName ? `${modelName} · ${sessionTitle}` : sessionTitle,
        description: b.shoot?.location || b.notes || undefined,
        start: b.startTime.toISOString(),
        end: b.endTime.toISOString(),
        allDay: false,
        link: b.model?.id ? `/models/${b.model.id}` : '/models',
        status: b.status,
      });
    }

    if (this.can(permissions, 'media.read')) {
      for (const s of shootsMedia) {
        if (bookingList.some((b) => b.shootId === s.id)) continue;
        events.push({
          id: `shoot:${s.id}`,
          type: 'SHOOT',
          title: s.title,
          description: [s.location, s.project?.name].filter(Boolean).join(' · ') || undefined,
          start: s.scheduledAt!.toISOString(),
          end: new Date(s.scheduledAt!.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          allDay: false,
          link: '/media',
          status: s.status,
        });
      }
    }

    const contentSeen = new Set<string>();
    for (const c of [...contentAssigned, ...contentModel]) {
      if (contentSeen.has(c.id) || !c.publishDate) continue;
      contentSeen.add(c.id);
      events.push({
        id: `content:${c.id}`,
        type: 'REEL_PUBLISH',
        title: c.title,
        description: c.platform ? `${c.platform} · ${c.status}` : c.status,
        start: c.publishDate.toISOString(),
        allDay: true,
        link: '/marketing',
        status: c.status,
      });
    }

    if (this.can(permissions, 'marketing.read')) {
      const teamContent = await this.prisma.contentCalendar.findMany({
        where: { publishDate: { gte: start, lte: end } },
      });
      for (const c of teamContent) {
        if (contentSeen.has(c.id) || !c.publishDate) continue;
        contentSeen.add(c.id);
        events.push({
          id: `content:${c.id}`,
          type: 'REEL_PUBLISH',
          title: c.title,
          description: c.platform ? `${c.platform} · ${c.status}` : c.status,
          start: c.publishDate.toISOString(),
          allDay: true,
          link: '/marketing',
          status: c.status,
        });
      }
    }

    for (const ph of phases) {
      events.push({
        id: `phase:${ph.id}`,
        type: 'DELIVERY',
        title: `${ph.name} phase deadline`,
        description: ph.project.name,
        start: ph.dueDate!.toISOString(),
        allDay: true,
        link: `/projects/${ph.project.id}`,
        status: ph.status,
      });
    }

    for (const m of milestones) {
      events.push({
        id: `milestone:${m.id}`,
        type: 'DELIVERY',
        title: m.title,
        description: m.project.name,
        start: m.dueDate!.toISOString(),
        allDay: true,
        link: `/projects/${m.project.id}`,
      });
    }

    for (const p of projects) {
      events.push({
        id: `project:${p.id}`,
        type: 'DELIVERY',
        title: `Project delivery: ${p.name}`,
        description: `${p.progress}% complete`,
        start: p.endDate!.toISOString(),
        allDay: true,
        link: `/projects/${p.id}`,
        status: p.status,
      });
    }

    if (this.can(permissions, 'projects.delete')) {
      const pmProjects = await this.prisma.project.findMany({
        where: {
          endDate: { gte: start, lte: end },
          status: { notIn: ['COMPLETED', 'CANCELLED', 'ARCHIVED'] },
        },
      });
      for (const p of pmProjects) {
        if (events.some((e) => e.id === `project:${p.id}`)) continue;
        events.push({
          id: `project:${p.id}`,
          type: 'DELIVERY',
          title: `Project delivery: ${p.name}`,
          description: `${p.progress}% complete`,
          start: p.endDate!.toISOString(),
          allDay: true,
          link: `/projects/${p.id}`,
          status: p.status,
        });
      }
    }

    for (const m of meetingsOrganized) {
      events.push({
        id: `meeting:${m.id}`,
        type: 'MEETING',
        title: m.title,
        description: m.location || m.meetingUrl || undefined,
        start: m.startTime.toISOString(),
        end: m.endTime.toISOString(),
        allDay: false,
      });
    }

    for (const a of meetingsAttending) {
      const m = a.meeting;
      if (meetingsOrganized.some((o) => o.id === m.id)) continue;
      events.push({
        id: `meeting:${m.id}`,
        type: 'MEETING',
        title: m.title,
        description: m.location || undefined,
        start: m.startTime.toISOString(),
        end: m.endTime.toISOString(),
        allDay: false,
      });
    }

    return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }
}
