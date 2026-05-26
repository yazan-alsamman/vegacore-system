import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VulnerabilitySeverity } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class SecurityService {
  constructor(private prisma: PrismaService) {}

  async getReports(query: PaginationDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.securityReport.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { firstName: true, lastName: true } },
          _count: { select: { vulnerabilities: true } },
        },
      }),
      this.prisma.securityReport.count(),
    ]);
    return paginate(items, total, page, limit);
  }

  async getReport(id: string) {
    const report = await this.prisma.securityReport.findUnique({
      where: { id },
      include: {
        author: { select: { firstName: true, lastName: true, email: true } },
        vulnerabilities: { orderBy: { severity: 'asc' } },
      },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  createReport(authorId: string, data: {
    title: string; clientId?: string; type: string;
    summary?: string; findings?: unknown[]; severity?: VulnerabilitySeverity;
  }) {
    return this.prisma.securityReport.create({
      data: { authorId, ...data, findings: data.findings as Prisma.InputJsonValue },
    });
  }

  addVulnerability(reportId: string, data: {
    title: string; description?: string; severity: VulnerabilitySeverity;
    cvssScore?: number; remediation?: string;
  }) {
    return this.prisma.vulnerability.create({ data: { reportId, ...data } });
  }

  updateVulnerability(id: string, data: { status?: string; remediation?: string }) {
    return this.prisma.vulnerability.update({ where: { id }, data });
  }

  async removeReport(id: string) {
    await this.prisma.vulnerability.deleteMany({ where: { reportId: id } });
    await this.prisma.securityReport.delete({ where: { id } });
    return { message: 'Report deleted' };
  }

  async removeVulnerability(id: string) {
    await this.prisma.vulnerability.delete({ where: { id } });
    return { message: 'Vulnerability deleted' };
  }
}
