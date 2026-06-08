import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShootStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

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

  createShoot(data: {
    title: string; projectId?: string; location?: string;
    scheduledAt?: string; equipment?: Record<string, unknown>; shotList?: unknown[];
    notes?: string;
  }) {
    return this.prisma.shoot.create({
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

    return this.prisma.shoot.update({ where: { id }, data: patch });
  }

  createVideo(data: { title: string; shootId?: string; rawFileUrl?: string }) {
    return this.prisma.video.create({ data });
  }

  updateVideo(id: string, data: { editedUrl?: string; publishUrl?: string; status?: string }) {
    return this.prisma.video.update({ where: { id }, data });
  }

  async removeShoot(id: string) {
    await this.getShoot(id);
    await this.prisma.shoot.delete({ where: { id } });
    return { message: 'Shoot deleted' };
  }

  async removeVideo(id: string) {
    await this.prisma.video.delete({ where: { id } });
    return { message: 'Video deleted' };
  }
}
