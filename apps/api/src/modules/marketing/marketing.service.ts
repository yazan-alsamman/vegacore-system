import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class MarketingService {
  constructor(private prisma: PrismaService) {}

  async getCalendar(query: PaginationDto, status?: ContentStatus) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where: Prisma.ContentCalendarWhereInput = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.contentCalendar.findMany({
        where, skip, take: limit,
        orderBy: { publishDate: 'asc' },
        include: { campaign: true, model: { include: { user: { select: { firstName: true, lastName: true } } } } },
      }),
      this.prisma.contentCalendar.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async getWorkspace(clientId?: string) {
    const clientWhere = clientId ? { id: clientId } : {};
    const [clients, calendar, scripts, shoots, reels] = await Promise.all([
      this.prisma.client.findMany({
        where: clientWhere,
        select: { id: true, companyName: true },
        orderBy: { companyName: 'asc' },
      }),
      this.prisma.contentCalendar.findMany({
        where: clientId ? { metadata: { path: ['clientId'], equals: clientId } } : {},
        orderBy: [{ publishDate: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.script.findMany({
        where: clientId ? { clientId } : {},
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.shoot.findMany({
        where: clientId ? { project: { clientId } } : {},
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
        include: {
          project: { select: { id: true, name: true, clientId: true } },
          bookings: { include: { model: { include: { user: { select: { firstName: true, lastName: true } } } } } },
        },
      }),
      this.prisma.video.findMany({
        where: clientId ? { shoot: { project: { clientId } } } : {},
        orderBy: { updatedAt: 'desc' },
        include: { shoot: { include: { project: { select: { clientId: true } } } } },
      }),
    ]);

    return { clients, calendar, scripts, shoots, reels };
  }

  async createContent(data: {
    title: string; script?: string; platform?: string;
    publishDate?: string; status?: ContentStatus;
    modelId?: string; campaignId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const payload: Prisma.ContentCalendarUncheckedCreateInput = {
      title: data.title,
      script: data.script,
      platform: data.platform,
      publishDate: data.publishDate ? new Date(data.publishDate) : undefined,
      status: data.status,
      modelId: data.modelId,
      campaignId: data.campaignId,
      metadata: data.metadata as Prisma.InputJsonValue,
    };
    return this.prisma.contentCalendar.create({
      data: payload,
    });
  }

  async updateContent(id: string, data: Record<string, unknown>) {
    const item = await this.prisma.contentCalendar.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Content not found');
    return this.prisma.contentCalendar.update({ where: { id }, data: data as Prisma.ContentCalendarUpdateInput });
  }

  getCampaigns() {
    return this.prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createCampaign(data: { name: string; description?: string; startDate?: string; endDate?: string; budget?: number }) {
    return this.prisma.campaign.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async updateCampaign(id: string, data: Record<string, unknown>) {
    return this.prisma.campaign.update({ where: { id }, data: data as Prisma.CampaignUpdateInput });
  }

  getScripts(clientId?: string) {
    return this.prisma.script.findMany({
      where: clientId ? { clientId } : {},
      orderBy: { updatedAt: 'desc' },
    });
  }

  createScript(data: { title: string; content: string; clientId?: string; platform?: string }) {
    return this.prisma.script.create({ data });
  }

  async updateScript(id: string, data: Record<string, unknown>) {
    const script = await this.prisma.script.findUnique({ where: { id } });
    if (!script) throw new NotFoundException('Script not found');
    return this.prisma.script.update({ where: { id }, data: data as Prisma.ScriptUpdateInput });
  }

  async removeContent(id: string) {
    const item = await this.prisma.contentCalendar.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Content not found');
    await this.prisma.contentCalendar.delete({ where: { id } });
    return { message: 'Content deleted' };
  }

  async removeCampaign(id: string) {
    await this.prisma.campaign.delete({ where: { id } });
    return { message: 'Campaign deleted' };
  }

  async removeScript(id: string) {
    await this.prisma.script.delete({ where: { id } });
    return { message: 'Script deleted' };
  }
}
