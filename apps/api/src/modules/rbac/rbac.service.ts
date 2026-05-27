import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  private canManageFinancePermissions(permissions: string[]) {
    return permissions.includes('*') || permissions.includes('finance.read');
  }

  private async assertFinancePermissionChange(permissionId: string, actorPermissions: string[]) {
    if (this.canManageFinancePermissions(actorPermissions)) return;
    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (permission?.module === 'finance') {
      throw new ForbiddenException('Cannot assign or revoke finance permissions');
    }
  }

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

  async assignPermission(roleId: string, permissionId: string, actorPermissions: string[] = []) {
    await this.assertFinancePermissionChange(permissionId, actorPermissions);
    return this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    });
  }

  async revokePermission(roleId: string, permissionId: string, actorPermissions: string[] = []) {
    await this.assertFinancePermissionChange(permissionId, actorPermissions);
    return this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  }
}
