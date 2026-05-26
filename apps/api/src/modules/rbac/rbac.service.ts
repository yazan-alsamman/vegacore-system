import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  getRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
  }

  getPermissions() {
    return this.prisma.permission.findMany({ orderBy: { module: 'asc' } });
  }

  async assignPermission(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    });
  }

  async revokePermission(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  }
}
