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
  }) {
    return this.prisma.shoot.create({
      data: {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        equipment: data.equipment as Prisma.InputJsonValue,
        shotList: data.shotList as Prisma.InputJsonValue,
      },
    });
  }

  updateShoot(id: string, data: Record<string, unknown>) {
    return this.prisma.shoot.update({ where: { id }, data });
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
