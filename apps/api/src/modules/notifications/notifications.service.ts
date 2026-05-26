import { Injectable } from '@nestjs/common';
import { formatMoney } from '../../common/utils/money';
import { NotificationCategory, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthUser {
  id: string;
  permissions: string[];
}

interface AlertDraft {
  sourceKey: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  private can(permissions: string[], slug: string) {
    return permissions.includes('*') || permissions.includes(slug);
  }

  private isAdmin(permissions: string[]) {
    return permissions.includes('*');
  }

  getForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly && { read: false }) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getCenter(user: AuthUser) {
    await this.syncAlerts(user);
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 80,
      }),
      this.prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);

    const byCategory = {
      SHOOT_APPOINTMENT: items.filter((n) => n.category === 'SHOOT_APPOINTMENT').length,
      TASK_DELAY: items.filter((n) => n.category === 'TASK_DELAY').length,
      PAYMENT_DUE: items.filter((n) => n.category === 'PAYMENT_DUE').length,
      PROJECT_DELAY: items.filter((n) => n.category === 'PROJECT_DELAY').length,
    };

    return { items, unreadCount, byCategory };
  }

  async syncAlerts(user: AuthUser) {
    const drafts: AlertDraft[] = [];
    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { id: userId, permissions } = user;

    if (this.can(permissions, 'models.read') || this.can(permissions, 'media.read')) {
      const modelProfile = await this.prisma.modelProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (this.can(permissions, 'models.read')) {
        const bookingWhere: Prisma.ModelBookingWhereInput = {
          startTime: { gte: now, lte: inSevenDays },
          status: { notIn: ['cancelled', 'CANCELLED'] },
        };
        if (modelProfile && !this.isAdmin(permissions) && !this.can(permissions, 'media.read')) {
          bookingWhere.modelId = modelProfile.id;
        }

        const bookings = await this.prisma.modelBooking.findMany({
          where: bookingWhere,
          include: {
            model: { include: { user: { select: { firstName: true, lastName: true } } } },
            shoot: { select: { title: true } },
          },
          take: 15,
        });

        for (const b of bookings) {
          const name = `${b.model.user.firstName} ${b.model.user.lastName}`;
          const when = b.startTime.toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' });
          drafts.push({
            sourceKey: `booking:${b.id}`,
            category: 'SHOOT_APPOINTMENT',
            type: 'INFO',
            title: 'Photoshoot appointment',
            message: `${name} — ${b.shoot?.title || b.notes || 'Studio session'} · ${when}`,
            link: '/models',
          });
        }
      }

      if (this.can(permissions, 'media.read')) {
        const shoots = await this.prisma.shoot.findMany({
          where: {
            scheduledAt: { gte: now, lte: inSevenDays },
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
          include: { project: { select: { name: true } } },
          take: 15,
        });

        for (const s of shoots) {
          const when = s.scheduledAt!.toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' });
          drafts.push({
            sourceKey: `shoot:${s.id}`,
            category: 'SHOOT_APPOINTMENT',
            type: 'INFO',
            title: 'Photoshoot appointment',
            message: `${s.title}${s.project ? ` · ${s.project.name}` : ''} · ${when}${s.location ? ` · ${s.location}` : ''}`,
            link: '/media',
          });
        }
      }
    }

    if (this.can(permissions, 'tasks.read')) {
      const taskWhere: Prisma.TaskWhereInput = {
        status: { not: 'DONE' },
        dueDate: { lt: now },
      };
      if (!this.isAdmin(permissions) && !this.can(permissions, 'dashboard.read')) {
        taskWhere.assigneeId = userId;
      }

      const tasks = await this.prisma.task.findMany({
        where: taskWhere,
        include: { project: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 20,
      });

      for (const t of tasks) {
        const days = Math.ceil((now.getTime() - t.dueDate!.getTime()) / (24 * 60 * 60 * 1000));
        drafts.push({
          sourceKey: `task:${t.id}`,
          category: 'TASK_DELAY',
          type: 'WARNING',
          title: 'Task overdue',
          message: `${t.title}${t.project ? ` · ${t.project.name}` : ''} — ${days} day(s) late`,
          link: t.projectId ? `/projects/${t.projectId}` : '/tasks',
        });
      }
    }

    if (this.can(permissions, 'finance.read')) {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          OR: [
            { status: 'OVERDUE' },
            { status: 'SENT', dueDate: { lt: now } },
          ],
        },
        include: { client: { select: { companyName: true } } },
        take: 20,
      });

      for (const inv of invoices) {
        drafts.push({
          sourceKey: `invoice:${inv.id}`,
          category: 'PAYMENT_DUE',
          type: 'PAYMENT',
          title: 'Payment due',
          message: `${inv.client.companyName} — ${inv.number} · ${formatMoney(inv.total)}`,
          link: '/finance',
        });
      }
    }

    if (this.can(permissions, 'projects.read')) {
      const projects = await this.prisma.project.findMany({
        where: {
          status: { notIn: ['COMPLETED', 'CANCELLED', 'ARCHIVED'] },
          endDate: { lt: now },
        },
        include: { client: { select: { companyName: true } } },
        take: 20,
      });

      for (const p of projects) {
        const days = Math.ceil((now.getTime() - p.endDate!.getTime()) / (24 * 60 * 60 * 1000));
        drafts.push({
          sourceKey: `project:${p.id}`,
          category: 'PROJECT_DELAY',
          type: 'WARNING',
          title: 'Project delayed',
          message: `${p.name} · ${p.client?.companyName || '—'} — ${days} day(s) past deadline`,
          link: `/projects/${p.id}`,
        });
      }
    }

    const activeKeys = new Set(drafts.map((d) => d.sourceKey));

    for (const d of drafts) {
      await this.prisma.notification.upsert({
        where: { userId_sourceKey: { userId, sourceKey: d.sourceKey } },
        create: {
          userId,
          sourceKey: d.sourceKey,
          category: d.category,
          type: d.type,
          title: d.title,
          message: d.message,
          link: d.link,
        },
        update: {
          category: d.category,
          type: d.type,
          title: d.title,
          message: d.message,
          link: d.link,
        },
      });
    }

    const stale = await this.prisma.notification.findMany({
      where: {
        userId,
        sourceKey: { not: null },
        category: { not: null },
      },
      select: { id: true, sourceKey: true },
    });

    const toRemove = stale.filter((n) => n.sourceKey && !activeKeys.has(n.sourceKey));
    if (toRemove.length) {
      await this.prisma.notification.deleteMany({
        where: { id: { in: toRemove.map((n) => n.id) } },
      });
    }
  }

  create(userId: string, data: { type?: NotificationType; category?: NotificationCategory; title: string; message: string; link?: string }) {
    return this.prisma.notification.create({ data: { userId, ...data } });
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
