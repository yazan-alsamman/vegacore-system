import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetType, Prisma, TaskStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import {
  CreateClientAssetDto,
  CreateClientDto,
  CreatePackageDto,
  UpdateClientDto,
  UpdatePackageDto,
} from './dto/client.dto';
import {
  FileSection,
  isBuiltinFileSectionKey,
  parseFileSections,
} from './file-sections';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(query: PaginationDto, status?: string) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = {};
    if (status) where.status = status as Prisma.EnumClientStatusFilter['equals'];
    if (query.search) {
      where.OR = [
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { ownerName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { projects: true, invoices: true } },
          packages: { where: { isActive: true }, take: 1 },
        },
      }),
      this.prisma.client.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        packages: true,
        projects: { take: 10, orderBy: { createdAt: 'desc' } },
        invoices: { take: 10, orderBy: { createdAt: 'desc' } },
        contracts: true,
        timeline: { orderBy: { createdAt: 'desc' }, take: 20 },
        assets: { take: 20 },
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async getProfile(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        packages: { orderBy: { isActive: 'desc' } },
        assets: { orderBy: { createdAt: 'desc' } },
        contracts: { orderBy: { createdAt: 'desc' } },
        meetings: {
          orderBy: { startTime: 'desc' },
          include: { organizer: { select: { firstName: true, lastName: true } } },
        },
        timeline: { orderBy: { createdAt: 'desc' } },
        projects: {
          orderBy: { createdAt: 'desc' },
          include: {
            tasks: {
              orderBy: { updatedAt: 'desc' },
              include: {
                assignee: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: { payments: true },
        },
        subscriptions: { orderBy: { nextDue: 'asc' } },
      },
    });
    if (!client) throw new NotFoundException('Client not found');

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { entity: 'client', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    const activePackage = client.packages.find((p) => p.isActive) || client.packages[0];
    const fileSections = parseFileSections(client.assetFileSections);
    const assetsByType = this.groupAssetsByType(client.assets, fileSections);

    const totalInvoiced = client.invoices.reduce((s, i) => s + i.total, 0);
    const totalPaid = client.invoices.reduce(
      (s, inv) =>
        s + inv.payments.filter((p) => p.status === 'COMPLETED').reduce((ps, p) => ps + p.amount, 0),
      0,
    );
    const remaining = Math.max(0, totalInvoiced - totalPaid);

    const payments = client.invoices
      .flatMap((inv) =>
        inv.payments
          .filter((p) => p.status === 'COMPLETED')
          .map((p) => ({
            id: p.id,
            amount: p.amount,
            method: p.method,
            reason: p.reason,
            reference: p.reference,
            paidAt: p.paidAt,
            createdAt: p.createdAt,
            invoiceId: inv.id,
            invoiceNumber: inv.number,
          })),
      )
      .sort(
        (a, b) =>
          new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime(),
      );

    const renewalDate =
      client.subscriptions.find((s) => s.isActive)?.nextDue ||
      activePackage?.contractEnd ||
      null;

    const alerts = this.buildFinancialAlerts(client.invoices, activePackage, client.subscriptions);

    const completedTasks = client.projects.flatMap((p) =>
      p.tasks
        .filter((t) => t.status === TaskStatus.DONE)
        .map((t) => ({
          id: t.id,
          type: 'task_completed',
          title: t.title,
          content: p.name,
          createdAt: t.updatedAt,
          metadata: { projectId: p.id, priority: t.priority },
        })),
    );

    const history = [
      ...client.timeline.map((e) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        content: e.content,
        createdAt: e.createdAt,
        metadata: e.metadata,
        source: 'timeline' as const,
      })),
      ...client.meetings.map((m) => ({
        id: m.id,
        type: 'meeting',
        title: m.title,
        content: m.description,
        createdAt: m.startTime,
        source: 'meeting' as const,
        metadata: {
          location: m.location,
          meetingUrl: m.meetingUrl,
          organizer: `${m.organizer.firstName} ${m.organizer.lastName}`,
        },
      })),
      ...auditLogs.map((a) => ({
        id: a.id,
        type: 'edit',
        title: `${a.action} — ${a.entity}`,
        content: null,
        createdAt: a.createdAt,
        metadata: { user: a.user ? `${a.user.firstName} ${a.user.lastName}` : null },
      })),
      ...completedTasks,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      client: {
        id: client.id,
        companyName: client.companyName,
        ownerName: client.ownerName,
        phone: client.phone,
        email: client.email,
        country: client.country,
        socialLinks: client.socialLinks,
        businessType: client.businessType,
        onboardingDate: client.onboardingDate,
        status: client.status,
        notes: client.notes,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      },
      package: activePackage,
      packages: client.packages,
      fileSections,
      assetsByType,
      contracts: client.contracts,
      projects: client.projects.map(({ tasks, ...p }) => p),
      meetings: client.meetings,
      invoices: client.invoices,
      payments,
      subscriptions: client.subscriptions,
      financial: {
        totalInvoiced,
        totalPaid,
        remaining,
        renewalDate,
        alerts,
      },
      history,
    };
  }

  private resolveAssetCategory(asset: { type: AssetType; metadata?: unknown }) {
    if (asset.type === 'OTHER' && asset.metadata && typeof asset.metadata === 'object') {
      const key = (asset.metadata as Record<string, unknown>).categoryKey;
      if (key) return String(key);
    }
    return asset.type;
  }

  private groupAssetsByType(
    assets: { type: AssetType; metadata?: unknown; [key: string]: unknown }[],
    sections: FileSection[],
  ) {
    const grouped: Record<string, typeof assets> = {};
    for (const { key } of sections) grouped[key] = [];
    for (const asset of assets) {
      const cat = this.resolveAssetCategory(asset);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(asset);
    }
    return grouped;
  }

  private async persistFileSections(clientId: string, sections: FileSection[], userId?: string) {
    const existing = await this.findOne(clientId);
    const client = await this.prisma.client.update({
      where: { id: clientId },
      data: { assetFileSections: sections as Prisma.InputJsonValue },
    });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'client',
      entityId: clientId,
      oldData: { assetFileSections: existing.assetFileSections } as Prisma.InputJsonValue,
      newData: { assetFileSections: client.assetFileSections } as Prisma.InputJsonValue,
    });
    return sections;
  }

  async addFileSection(clientId: string, label: string, userId?: string) {
    const client = await this.findOne(clientId);
    const trimmed = label.trim();
    if (!trimmed) throw new BadRequestException('Label is required');
    const sections = parseFileSections(client.assetFileSections);
    const key = `custom_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    sections.push({ key, label: trimmed });
    return this.persistFileSections(clientId, sections, userId);
  }

  async updateFileSection(clientId: string, key: string, label: string, userId?: string) {
    const client = await this.findOne(clientId);
    const trimmed = label.trim();
    if (!trimmed) throw new BadRequestException('Label is required');
    const sections = parseFileSections(client.assetFileSections);
    const idx = sections.findIndex((s) => s.key === key);
    if (idx < 0) throw new NotFoundException('File section not found');
    sections[idx] = { ...sections[idx], label: trimmed };
    return this.persistFileSections(clientId, sections, userId);
  }

  async deleteFileSection(clientId: string, key: string, userId?: string) {
    const client = await this.findOne(clientId);
    const sections = parseFileSections(client.assetFileSections);
    if (sections.length <= 1) {
      throw new BadRequestException('At least one file type is required');
    }
    const next = sections.filter((s) => s.key !== key);
    if (next.length === sections.length) throw new NotFoundException('File section not found');

    const assets = await this.prisma.asset.findMany({ where: { clientId } });
    const toDelete = assets.filter((a) => this.resolveAssetCategory(a) === key);
    if (toDelete.length > 0) {
      await this.prisma.assetVersion.deleteMany({
        where: { assetId: { in: toDelete.map((a) => a.id) } },
      });
      await this.prisma.asset.deleteMany({ where: { id: { in: toDelete.map((a) => a.id) } } });
    }

    await this.persistFileSections(clientId, next, userId);
    return { message: 'File section deleted', deletedAssets: toDelete.length };
  }

  private buildClientAssetData(dto: CreateClientAssetDto) {
    const categoryKey = (dto.categoryKey || dto.type || '').trim();
    if (!categoryKey) throw new BadRequestException('categoryKey is required');

    const builtIn = isBuiltinFileSectionKey(categoryKey);
    const type: AssetType = builtIn ? (categoryKey as AssetType) : 'OTHER';
    const metadata: Record<string, unknown> = {
      ...((dto.metadata as Record<string, unknown>) || {}),
    };
    if (!builtIn) metadata.categoryKey = categoryKey;

    return { type, metadata, categoryKey };
  }

  private buildFinancialAlerts(
    invoices: { status: string; dueDate: Date | null; number: string; total: number }[],
    activePackage: { contractEnd: Date | null } | undefined,
    subscriptions: { isActive: boolean; nextDue: Date | null; name: string }[],
  ) {
    const alerts: { level: string; message: string }[] = [];
    const now = new Date();

    for (const inv of invoices) {
      if (['SENT', 'OVERDUE'].includes(inv.status) && inv.dueDate && inv.dueDate < now) {
        alerts.push({
          level: 'error',
          message: `Overdue invoice ${inv.number} (${inv.total})`,
        });
      } else if (inv.status === 'SENT' && inv.dueDate) {
        const days = Math.ceil((inv.dueDate.getTime() - now.getTime()) / 86400000);
        if (days <= 7 && days >= 0) {
          alerts.push({
            level: 'warning',
            message: `Invoice ${inv.number} due in ${days} day(s)`,
          });
        }
      }
    }

    if (activePackage?.contractEnd) {
      const days = Math.ceil(
        (activePackage.contractEnd.getTime() - now.getTime()) / 86400000,
      );
      if (days <= 30 && days >= 0) {
        alerts.push({
          level: 'warning',
          message: `Contract ends in ${days} day(s)`,
        });
      }
    }

    for (const sub of subscriptions.filter((s) => s.isActive && s.nextDue)) {
      const days = Math.ceil((sub.nextDue!.getTime() - now.getTime()) / 86400000);
      if (days <= 14 && days >= 0) {
        alerts.push({
          level: 'info',
          message: `Renewal "${sub.name}" in ${days} day(s)`,
        });
      }
    }

    return alerts;
  }

  async create(dto: CreateClientDto, userId?: string) {
    const client = await this.prisma.client.create({
      data: {
        ...dto,
        onboardingDate: dto.onboardingDate ? new Date(dto.onboardingDate) : undefined,
        socialLinks: dto.socialLinks as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({ userId, action: 'CREATE', entity: 'client', entityId: client.id, newData: client as unknown as Prisma.InputJsonValue });
    return client;
  }

  async update(id: string, dto: UpdateClientDto, userId?: string) {
    const existing = await this.findOne(id);
    const data: Prisma.ClientUpdateInput = {};

    if (dto.companyName !== undefined) data.companyName = dto.companyName;
    if (dto.ownerName !== undefined) data.ownerName = dto.ownerName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.businessType !== undefined) data.businessType = dto.businessType;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.socialLinks !== undefined) {
      data.socialLinks = this.cleanSocialLinks(dto.socialLinks) as Prisma.InputJsonValue;
    }
    if (dto.onboardingDate !== undefined) {
      data.onboardingDate = dto.onboardingDate ? new Date(dto.onboardingDate) : null;
    }

    const client = await this.prisma.client.update({ where: { id }, data });
    await this.audit.log({ userId, action: 'UPDATE', entity: 'client', entityId: id, oldData: existing as unknown as Prisma.InputJsonValue, newData: client as unknown as Prisma.InputJsonValue });
    return client;
  }

  async updateSocialLinks(
    id: string,
    socialLinks: Record<string, string | Record<string, string>>,
    userId?: string,
  ) {
    return this.update(id, { socialLinks }, userId);
  }

  private cleanSocialLinks(links: Record<string, string | Record<string, string>>) {
    const cleaned: Record<string, string | Record<string, string>> = {};
    for (const [key, raw] of Object.entries(links)) {
      if (typeof raw === 'string') {
        const handle = raw.trim();
        if (handle) cleaned[key] = handle;
        continue;
      }
      if (raw && typeof raw === 'object') {
        const handle = String(raw.handle ?? raw.url ?? '').trim();
        const loginUsername = String(raw.loginUsername ?? '').trim();
        const loginPassword = String(raw.loginPassword ?? '').trim();
        if (!handle && !loginUsername && !loginPassword) continue;
        const entry: Record<string, string> = { handle };
        if (loginUsername) entry.loginUsername = loginUsername;
        if (loginPassword) entry.loginPassword = loginPassword;
        cleaned[key] = entry;
      }
    }
    return cleaned;
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    await this.prisma.client.update({ where: { id }, data: { status: 'INACTIVE' } });
    await this.audit.log({ userId, action: 'DELETE', entity: 'client', entityId: id });
    return { message: 'Client deactivated' };
  }

  async addPackage(clientId: string, dto: CreatePackageDto) {
    await this.findOne(clientId);
    await this.prisma.clientPackage.updateMany({ where: { clientId }, data: { isActive: false } });
    return this.prisma.clientPackage.create({
      data: {
        clientId,
        name: dto.name,
        packageType: dto.packageType,
        subscribedServices: dto.subscribedServices as Prisma.InputJsonValue,
        reelsQuota: dto.reelsQuota ?? 0,
        designQuota: dto.designQuota ?? 0,
        visitsQuota: dto.visitsQuota ?? 0,
        developmentHours: dto.developmentHours ?? 0,
        hostingType: dto.hostingType,
        hostingDetails: dto.hostingDetails as Prisma.InputJsonValue,
        contractStart: dto.contractStart ? new Date(dto.contractStart) : undefined,
        contractEnd: dto.contractEnd ? new Date(dto.contractEnd) : undefined,
        isActive: true,
      },
    });
  }

  async addTimeline(clientId: string, data: { type: string; title: string; content?: string }) {
    return this.prisma.clientTimeline.create({ data: { clientId, ...data } });
  }

  async addAsset(clientId: string, dto: CreateClientAssetDto) {
    await this.findOne(clientId);
    const { type, metadata } = this.buildClientAssetData(dto);
    return this.prisma.asset.create({
      data: {
        clientId,
        name: dto.name,
        type,
        fileUrl: dto.fileUrl || '#',
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  async updatePackage(clientId: string, packageId: string, dto: UpdatePackageDto) {
    const pkg = await this.prisma.clientPackage.findFirst({ where: { id: packageId, clientId } });
    if (!pkg) throw new NotFoundException('Package not found');
    if (dto.isActive) {
      await this.prisma.clientPackage.updateMany({ where: { clientId, id: { not: packageId } }, data: { isActive: false } });
    }
    const data: Prisma.ClientPackageUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.packageType !== undefined) data.packageType = dto.packageType;
    if (dto.subscribedServices !== undefined) data.subscribedServices = dto.subscribedServices as Prisma.InputJsonValue;
    if (dto.reelsQuota !== undefined) data.reelsQuota = dto.reelsQuota;
    if (dto.designQuota !== undefined) data.designQuota = dto.designQuota;
    if (dto.visitsQuota !== undefined) data.visitsQuota = dto.visitsQuota;
    if (dto.developmentHours !== undefined) data.developmentHours = dto.developmentHours;
    if (dto.hostingType !== undefined) data.hostingType = dto.hostingType;
    if (dto.hostingDetails !== undefined) data.hostingDetails = dto.hostingDetails as Prisma.InputJsonValue;
    if (dto.contractStart) data.contractStart = new Date(dto.contractStart);
    if (dto.contractEnd) data.contractEnd = new Date(dto.contractEnd);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.clientPackage.update({ where: { id: packageId }, data });
  }

  async updateAsset(clientId: string, assetId: string, dto: Partial<CreateClientAssetDto>) {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, clientId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const patch: Prisma.AssetUpdateInput = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.fileUrl !== undefined) patch.fileUrl = dto.fileUrl;

    if (dto.categoryKey !== undefined || dto.type !== undefined || dto.metadata !== undefined) {
      const merged: CreateClientAssetDto = {
        name: dto.name ?? asset.name,
        categoryKey: dto.categoryKey ?? dto.type ?? this.resolveAssetCategory(asset),
        fileUrl: dto.fileUrl,
        metadata: (dto.metadata ?? asset.metadata) as Record<string, unknown> | undefined,
      };
      const { type, metadata } = this.buildClientAssetData(merged);
      patch.type = type;
      patch.metadata = metadata as Prisma.InputJsonValue;
    }

    return this.prisma.asset.update({ where: { id: assetId }, data: patch });
  }

  async removeAsset(clientId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, clientId } });
    if (!asset) throw new NotFoundException('Asset not found');
    await this.prisma.assetVersion.deleteMany({ where: { assetId } });
    await this.prisma.asset.delete({ where: { id: assetId } });
    return { message: 'Asset deleted' };
  }

  async removeTimeline(clientId: string, timelineId: string) {
    const entry = await this.prisma.clientTimeline.findFirst({ where: { id: timelineId, clientId } });
    if (!entry) throw new NotFoundException('Timeline entry not found');
    await this.prisma.clientTimeline.delete({ where: { id: timelineId } });
    return { message: 'Timeline entry deleted' };
  }

  async addSubscription(
    clientId: string,
    data: { name: string; amount: number; interval: string; nextDue?: string },
  ) {
    await this.findOne(clientId);
    return this.prisma.subscription.create({
      data: {
        clientId,
        name: data.name,
        amount: data.amount,
        interval: data.interval,
        nextDue: data.nextDue ? new Date(data.nextDue) : undefined,
      },
    });
  }

  async updateSubscription(
    clientId: string,
    subId: string,
    data: Partial<{ name: string; amount: number; interval: string; nextDue: string; isActive: boolean }>,
  ) {
    const sub = await this.prisma.subscription.findFirst({ where: { id: subId, clientId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    return this.prisma.subscription.update({
      where: { id: subId },
      data: {
        ...data,
        nextDue: data.nextDue ? new Date(data.nextDue) : undefined,
      },
    });
  }

  async removeSubscription(clientId: string, subId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { id: subId, clientId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    await this.prisma.subscription.delete({ where: { id: subId } });
    return { message: 'Subscription deleted' };
  }
}
