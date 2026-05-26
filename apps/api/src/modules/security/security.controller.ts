import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SecurityService } from './security.service';

@ApiTags('Cybersecurity')
@ApiBearerAuth()
@Controller('security')
export class SecurityController {
  constructor(private securityService: SecurityService) {}

  @RequirePermissions('security.read')
  @Get('reports')
  getReports(@Query() query: PaginationDto) {
    return this.securityService.getReports(query);
  }

  @RequirePermissions('security.read')
  @Get('reports/:id')
  getReport(@Param('id') id: string) {
    return this.securityService.getReport(id);
  }

  @RequirePermissions('security.create')
  @Post('reports')
  createReport(@CurrentUser('id') userId: string, @Body() body: Record<string, unknown>) {
    return this.securityService.createReport(userId, body as Parameters<SecurityService['createReport']>[1]);
  }

  @RequirePermissions('security.create')
  @Post('reports/:id/vulnerabilities')
  addVulnerability(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.securityService.addVulnerability(id, body as Parameters<SecurityService['addVulnerability']>[1]);
  }

  @RequirePermissions('security.update')
  @Patch('vulnerabilities/:id')
  updateVulnerability(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.securityService.updateVulnerability(id, body as Parameters<SecurityService['updateVulnerability']>[1]);
  }

  @RequirePermissions('security.delete')
  @Delete('reports/:id')
  removeReport(@Param('id') id: string) {
    return this.securityService.removeReport(id);
  }

  @RequirePermissions('security.delete')
  @Delete('vulnerabilities/:id')
  removeVulnerability(@Param('id') id: string) {
    return this.securityService.removeVulnerability(id);
  }
}
