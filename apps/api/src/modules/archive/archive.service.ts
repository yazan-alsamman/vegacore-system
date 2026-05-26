import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetType, Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

export type ArchiveCategory =
  | 'all'
  | 'projects'
  | 'clients'
  | 'contracts'
  | 'designs'
  | 'videos'
  | 'conversations'
  | 'releases'
  | 'media';

const DESIGN_TYPES: AssetType[] = ['BRANDING', 'LOGO', 'DESIGN'];
const MEDIA_TYPES: AssetType[] = ['MEDIA', 'VIDEO'];

@Injectable()
export class ArchiveService {
  constructor(private prisma: PrismaService) {}

  private categoryTypes(category?: ArchiveCategory): AssetType[] | undefined {
    if (!category || category === 'all' || category === 'clients' || category === 'projects') return undefined;
    if (category === 'contracts') return ['CONTRACT'];
    if (category === 'designs') return DESIGN_TYPES;
    if (category === 'videos') return ['VIDEO'];
    if (category === 'conversations') return ['CONVERSATION'];
    if (category === 'releases') return ['RELEASE'];
    if (category === 'media') return MEDIA_TYPES;
    return undefined;
  }

  async search(
    query: PaginationDto,
    filters?: {
      type?: AssetType;
      clientId?: string;
      projectId?: string;
      tags?: string;
      category?: ArchiveCategory;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 24;
    const skip = (page - 1) * limit;
    const where: Prisma.AssetWhereInput = {};

    const categoryTypes = this.categoryTypes(filters?.category);
    if (filters?.type) where.type = filters.type;
    else if (categoryTypes) where.type = { in: categoryTypes };

    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.tags) where.tags = { hasSome: filters.tags.split(',').map((t) => t.trim()).filter(Boolean) };

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { hasSome: [q.toLowerCase()] } },
      ];
    }

    const orderBy: Prisma.AssetOrderByWithRelationInput =
      query.sortBy === 'name'
        ? { name: query.sortOrder === 'asc' ? 'asc' : 'desc' }
        : { createdAt: query.sortOrder === 'asc' ? 'asc' : 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          client: { select: { id: true, companyName: true } },
          project: { select: { id: true, name: true, status: true } },
          versions: { orderBy: { version: 'desc' }, take: 5 },
          _count: { select: { versions: true } },
        },
      }),
      this.prisma.asset.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  getAsset(id: string) {
    return this.prisma.asset.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true, status: true } },
        versions: { orderBy: { version: 'desc' } },
      },
    });
  }

  createAsset(data: {
    name: string;
    type: AssetType;
    fileUrl: string;
    description?: string;
    fileSize?: number;
    mimeType?: string;
    tags?: string[];
    clientId?: string;
    projectId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.asset.create({
      data: {
        ...data,
        tags: data.tags || [],
        metadata: data.metadata as Prisma.InputJsonValue,
      },
      include: {
        client: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  async updateAsset(id: string, data: Record<string, unknown>) {
    const patch: Prisma.AssetUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name as string;
    if (data.description !== undefined) patch.description = data.description as string;
    if (data.type !== undefined) patch.type = data.type as AssetType;
    if (data.fileUrl !== undefined) patch.fileUrl = data.fileUrl as string;
    if (data.tags !== undefined) patch.tags = data.tags as string[];
    if (data.metadata !== undefined) patch.metadata = data.metadata as Prisma.InputJsonValue;
    return this.prisma.asset.update({
      where: { id },
      data: patch,
      include: {
        client: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true } },
        versions: { orderBy: { version: 'desc' } },
      },
    });
  }

  async addVersion(assetId: string, data: { fileUrl: string; notes?: string; fileSize?: number; mimeType?: string }) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    const newVersion = (asset.version || 0) + 1;
    await this.prisma.assetVersion.create({
      data: {
        assetId,
        version: newVersion,
        fileUrl: data.fileUrl,
        notes: data.notes,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      },
    });
    return this.prisma.asset.update({
      where: { id: assetId },
      data: { version: newVersion, fileUrl: data.fileUrl },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
  }

  getContracts(clientId?: string) {
    return this.prisma.contract.findMany({
      where: clientId ? { clientId } : {},
      include: { client: { select: { id: true, companyName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createContract(data: {
    clientId: string;
    title: string;
    fileUrl?: string;
    startDate?: string;
    endDate?: string;
    value?: number;
    status?: string;
  }) {
    return this.prisma.contract.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: { client: { select: { id: true, companyName: true } } },
    });
  }

  async updateContract(id: string, data: Record<string, unknown>) {
    return this.prisma.contract.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title as string } : {}),
        ...(data.fileUrl !== undefined ? { fileUrl: data.fileUrl as string } : {}),
        ...(data.status !== undefined ? { status: data.status as string } : {}),
        ...(data.value !== undefined ? { value: Number(data.value) } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate as string) : null } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate as string) : null } : {}),
      },
      include: { client: { select: { id: true, companyName: true } } },
    });
  }

  async removeAsset(id: string) {
    await this.prisma.assetVersion.deleteMany({ where: { assetId: id } });
    await this.prisma.asset.delete({ where: { id } });
    return { message: 'Asset deleted' };
  }

  async removeContract(id: string) {
    await this.prisma.contract.delete({ where: { id } });
    return { message: 'Contract deleted' };
  }

  async getTags() {
    const assets = await this.prisma.asset.findMany({ select: { tags: true } });
    const set = new Set<string>();
    for (const a of assets) {
      for (const t of a.tags) set.add(t);
    }
    return Array.from(set).sort();
  }

  async getStats() {
    const [byType, projectsArchived, contracts, videos, conversations] = await Promise.all([
      this.prisma.asset.groupBy({ by: ['type'], _count: { id: true } }),
      this.prisma.project.count({ where: { status: 'ARCHIVED' } }),
      this.prisma.contract.count(),
      this.prisma.asset.count({ where: { type: 'VIDEO' } }),
      this.prisma.asset.count({ where: { type: 'CONVERSATION' } }),
    ]);
    const totalAssets = byType.reduce((s, r) => s + r._count.id, 0);
    return {
      totalAssets,
      projectsArchived,
      contracts,
      videos,
      conversations,
      byType: byType.map((r) => ({ type: r.type, count: r._count.id })),
    };
  }

  async archiveProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { id: true, companyName: true } },
        assets: true,
        _count: { select: { tasks: true, issues: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'ARCHIVED' as ProjectStatus, archivedAt: new Date() },
    });

    const summaryAsset = await this.prisma.asset.create({
      data: {
        name: `Project archive: ${project.name}`,
        description: `Archived project with ${project._count.tasks} tasks and ${project._count.issues} issues`,
        type: 'DOCUMENT',
        fileUrl: '#',
        clientId: project.clientId || undefined,
        projectId: project.id,
        tags: ['archived-project', 'project-bundle'],
        archivedAt: new Date(),
        metadata: {
          projectId: project.id,
          projectStatus: 'ARCHIVED',
          taskCount: project._count.tasks,
          issueCount: project._count.issues,
          assetCount: project.assets.length,
        } as Prisma.InputJsonValue,
      },
    });

    return { project, summaryAsset };
  }

  async getWorkspace(filters?: {
    search?: string;
    category?: ArchiveCategory;
    type?: AssetType;
    clientId?: string;
    projectId?: string;
    tags?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const query: PaginationDto = {
      page: filters?.page || 1,
      limit: filters?.limit || 48,
      search: filters?.search,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const [assetsPage, contracts, archivedProjects, clients, projects, tags, stats] = await Promise.all([
      this.search(query, {
        category: filters?.category,
        type: filters?.type,
        clientId: filters?.clientId,
        projectId: filters?.projectId,
        tags: filters?.tags,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
      }),
      filters?.category === 'contracts' || !filters?.category || filters.category === 'all'
        ? this.getContracts(filters?.clientId)
        : Promise.resolve([]),
      filters?.category === 'projects' || !filters?.category || filters.category === 'all'
        ? this.prisma.project.findMany({
            where: {
              status: { in: ['ARCHIVED', 'COMPLETED', 'CANCELLED'] },
              ...(filters?.clientId ? { clientId: filters.clientId } : {}),
            },
            include: {
              client: { select: { id: true, companyName: true } },
              _count: { select: { assets: true, tasks: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),
      this.prisma.client.findMany({ select: { id: true, companyName: true }, orderBy: { companyName: 'asc' } }),
      this.prisma.project.findMany({
        select: { id: true, name: true, clientId: true, status: true },
        orderBy: { name: 'asc' },
        take: 100,
      }),
      this.getTags(),
      this.getStats(),
    ]);

    let timelineItems: {
      id: string;
      kind: string;
      name: string;
      type: string;
      content?: string;
      client?: { companyName: string };
      createdAt: Date;
    }[] = [];

    if (filters?.category === 'conversations' || !filters?.category || filters.category === 'all') {
      const timeline = await this.prisma.clientTimeline.findMany({
        where: {
          ...(filters?.clientId ? { clientId: filters.clientId } : {}),
          type: { in: ['message', 'whatsapp', 'email', 'call', 'note'] },
          ...(filters?.search
            ? {
                OR: [
                  { title: { contains: filters.search, mode: 'insensitive' } },
                  { content: { contains: filters.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: { client: { select: { companyName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      timelineItems = timeline.map((t) => ({
        id: t.id,
        kind: 'timeline',
        name: t.title,
        type: t.type,
        content: t.content || undefined,
        client: t.client,
        createdAt: t.createdAt,
      }));
    }

    const videoAssets =
      filters?.category === 'videos' || !filters?.category || filters.category === 'all'
        ? await this.prisma.video.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: { shoot: { select: { title: true, project: { select: { name: true, clientId: true } } } } },
          })
        : [];

    return {
      assets: assetsPage.data,
      assetsMeta: assetsPage.meta,
      contracts,
      archivedProjects,
      timeline: timelineItems,
      videos: videoAssets,
      clients,
      projects,
      tags,
      stats,
    };
  }
}
