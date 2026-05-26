import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RbacService } from './rbac.service';

@ApiTags('RBAC')
@ApiBearerAuth()
@Controller('rbac')
export class RbacController {
  constructor(private rbacService: RbacService) {}

  @RequirePermissions('rbac.read')
  @Get('roles')
  getRoles() {
    return this.rbacService.getRoles();
  }

  @RequirePermissions('rbac.read')
  @Get('permissions')
  getPermissions() {
    return this.rbacService.getPermissions();
  }

  @RequirePermissions('rbac.manage')
  @Post('assign')
  assign(@Body() body: { roleId: string; permissionId: string }) {
    return this.rbacService.assignPermission(body.roleId, body.permissionId);
  }

  @RequirePermissions('rbac.manage')
  @Delete('revoke')
  revoke(@Body() body: { roleId: string; permissionId: string }) {
    return this.rbacService.revokePermission(body.roleId, body.permissionId);
  }
}
