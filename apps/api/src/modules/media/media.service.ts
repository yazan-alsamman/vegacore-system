import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShootStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class MediaService {
  private static readonly SHOOT_DURATION_MS = 2 * 60 * 60 * 1000;

  constructor(private prisma: PrismaService) {}

  private parseEquipment(equipment: unknown): Record<string, unknown> {
    return (equipment || {}) as Record<string, unknown>;
  }

  /** Keep model calendar in sync when a shoot row assigns model + date. */
  private async syncShootAssignments(shoot: {
    id: string;
    title: string;
    scheduledAt: Date | null;
    equipment: unknown;
  }) {
    const modelId = String(this.parseEquipment(shoot.equipment).modelId || '').trim() || undefined;
    const existing = await this.prisma.modelBooking.findMany({ where: { shootId: shoot.id } });

    if (modelId && shoot.scheduledAt) {
      const startTime = shoot.scheduledAt;
      const endTime = new Date(startTime.getTime() + MediaService.SHOOT_DURATION_MS);
      const match = existing.find((b) => b.modelId === modelId);
      const stale = existing.filter((b) => b.modelId !== modelId);

      if (stale.length) {
        await this.prisma.modelBooking.deleteMany({ where: { id: { in: stale.map((b) => b.id) } } });
      }

      if (match) {
        await this.prisma.modelBooking.update({
          where: { id: match.id },
          data: { startTime, endTime, notes: shoot.title },
        });
      } else {
        await this.prisma.modelBooking.create({
          data: {
            modelId,
            shootId: shoot.id,
            startTime,
            endTime,
            notes: shoot.title,
            status: 'confirmed',
          },
        });
      }
      return;
    }

    if (existing.length) {
      await this.prisma.modelBooking.deleteMany({ where: { shootId: shoot.id } });
    }
  }

  async getShoots(query: PaginationDto, status?: ShootStatus) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.shoot.findMany({
        where, skip, take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: { project: { select: { id: true, name: true } }, _count: { select: { bookings: true, videos: true } } },
      }),
      this.prisma.shoot.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async getShoot(id: string) {
    const shoot = await this.prisma.shoot.findUnique({
      where: { id },
      include: { bookings: { include: { model: { include: { user: true } } } }, videos: true, project: true },
    });
    if (!shoot) throw new NotFoundException('Shoot not found');
    return shoot;
  }

  async createShoot(data: {
    title: string; projectId?: string; location?: string;
    scheduledAt?: string; equipment?: Record<string, unknown>; shotList?: unknown[];
    notes?: string;
  }) {
    const created = await this.prisma.shoot.create({
      data: {
        title: data.title,
        projectId: data.projectId,
        location: data.location,
        notes: data.notes,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        equipment: data.equipment as Prisma.InputJsonValue,
        shotList: data.shotList as Prisma.InputJsonValue,
      },
    });
    await this.syncShootAssignments(created);
    return created;
  }

  async updateShoot(id: string, data: Record<string, unknown>) {
    const item = await this.prisma.shoot.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Shoot not found');

    const patch: Prisma.ShootUpdateInput = {};
    if (data.title !== undefined) patch.title = String(data.title);
    if (data.location !== undefined) patch.location = data.location ? String(data.location) : null;
    if (data.notes !== undefined) patch.notes = data.notes ? String(data.notes) : null;
    if (data.scheduledAt !== undefined) {
      patch.scheduledAt = data.scheduledAt ? new Date(String(data.scheduledAt)) : null;
    }
    if (data.equipment !== undefined) {
      const existing = (item.equipment || {}) as Record<string, unknown>;
      const incoming = data.equipment as Record<string, unknown>;
      patch.equipment = { ...existing, ...incoming } as Prisma.InputJsonValue;
    }
    if (data.shotList !== undefined) {
      patch.shotList = data.shotList as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.shoot.update({ where: { id }, data: patch });
    await this.syncShootAssignments(updated);
    return updated;
  }

  createVideo(data: { title: string; shootId?: string; rawFileUrl?: string }) {
    return this.prisma.video.create({ data });
  }

  updateVideo(id: string, data: { editedUrl?: string; publishUrl?: string; status?: string }) {
    return this.prisma.video.update({ where: { id }, data });
  }

  async removeShoot(id: string) {
    await this.getShoot(id);
    await this.prisma.modelBooking.deleteMany({ where: { shootId: id } });
    await this.prisma.shoot.delete({ where: { id } });
    return { message: 'Shoot deleted' };
  }

  async removeVideo(id: string) {
    await this.prisma.video.delete({ where: { id } });
    return { message: 'Video deleted' };
  }
}
