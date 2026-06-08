import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class MarketingService {
  constructor(private prisma: PrismaService) {}

  /** Label for content-calendar rows — العنوان from calendar, then الفكرة. */
  formatCalendarReelLabel(item: {
    title?: string | null;
    script?: string | null;
    metadata?: unknown;
  }): string {
    const title = item.title?.trim();
    if (title) return title;
    const meta = (item.metadata || {}) as { idea?: string };
    const idea = meta.idea?.trim();
    if (idea) return idea;
    const script = item.script?.trim();
    if (script) return script.length > 60 ? `${script.slice(0, 60)}…` : script;
    return '—';
  }

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

  private clientShootWhere(clientId: string): Prisma.ShootWhereInput {
    return {
      OR: [
        { project: { clientId } },
        { equipment: { path: ['clientId'], equals: clientId } },
      ],
    };
  }

  async getWorkspace(clientId?: string) {
    const clientWhere = clientId ? { id: clientId } : {};
    const shootWhere = clientId ? this.clientShootWhere(clientId) : {};
    const [clients, calendar, scripts, shoots, reels, models, photographers] = await Promise.all([
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
        where: shootWhere,
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
        include: {
          project: { select: { id: true, name: true, clientId: true } },
          bookings: { include: { model: { include: { user: { select: { firstName: true, lastName: true } } } } } },
        },
      }),
      this.prisma.video.findMany({
        where: clientId
          ? {
              OR: [
                { shoot: { project: { clientId } } },
                { shoot: { equipment: { path: ['clientId'], equals: clientId } } },
              ],
            }
          : {},
        orderBy: { updatedAt: 'desc' },
        include: { shoot: { include: { project: { select: { clientId: true } } } } },
      }),
      this.prisma.modelProfile.findMany({
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.user.findMany({
        where: { role: { slug: 'photographer' }, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { firstName: 'asc' },
      }),
    ]);

    const pendingCalendar = calendar
      .filter((c) => c.status === 'SCHEDULED')
      .map((c) => ({
        id: c.id,
        label: this.formatCalendarReelLabel(c),
        title: c.title,
        platform: c.platform,
        status: c.status,
        publishDate: c.publishDate,
        metadata: c.metadata,
        script: c.script,
      }));

    return {
      clients,
      calendar,
      scripts,
      shoots,
      reels,
      models: models.map((m) => ({
        id: m.id,
        name: `${m.user.firstName} ${m.user.lastName}`.trim(),
      })),
      photographers: photographers.map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
      })),
      pendingCalendar,
    };
  }

  async createContent(data: {
    title: string; script?: string; platform?: string;
    publishDate?: string; status?: ContentStatus;
    modelId?: string; campaignId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const meta = (data.metadata || {}) as Record<string, unknown>;
    if (!meta.clientId) {
      throw new BadRequestException('metadata.clientId is required for content calendar items');
    }
    const payload: Prisma.ContentCalendarUncheckedCreateInput = {
      title: data.title,
      script: data.script,
      platform: data.platform,
      publishDate: data.publishDate ? new Date(data.publishDate) : undefined,
      status: data.status,
      modelId: data.modelId,
      campaignId: data.campaignId,
      metadata: meta as Prisma.InputJsonValue,
    };
    return this.prisma.contentCalendar.create({
      data: payload,
    });
  }

  async updateContent(id: string, data: Record<string, unknown>) {
    const item = await this.prisma.contentCalendar.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Content not found');

    const patch: Prisma.ContentCalendarUpdateInput = {};
    if (data.title !== undefined) patch.title = String(data.title);
    if (data.script !== undefined) patch.script = data.script ? String(data.script) : null;
    if (data.platform !== undefined) patch.platform = data.platform ? String(data.platform) : null;
    if (data.status !== undefined) patch.status = data.status as ContentStatus;
    if (data.publishDate !== undefined) {
      patch.publishDate = data.publishDate ? new Date(String(data.publishDate)) : null;
    }
    if (data.metadata !== undefined) {
      const existing = (item.metadata || {}) as Record<string, unknown>;
      const incoming = data.metadata as Record<string, unknown>;
      patch.metadata = { ...existing, ...incoming } as Prisma.InputJsonValue;
    }

    return this.prisma.contentCalendar.update({ where: { id }, data: patch });
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
    if (!data.clientId) {
      throw new BadRequestException('clientId is required for scripts');
    }
    return this.prisma.script.create({ data: { ...data, clientId: data.clientId } });
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
