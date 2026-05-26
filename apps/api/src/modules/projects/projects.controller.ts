import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @RequirePermissions('projects.read')
  @Get()
  findAll(
    @Query() query: PaginationDto,
    @Query('status') status?: ProjectStatus,
    @Query('clientId') clientId?: string,
  ) {
    return this.projectsService.findAll(query, status, clientId);
  }

  @RequirePermissions('projects.read')
  @Get(':id/dashboard')
  getDashboard(@Param('id') id: string) {
    return this.projectsService.getDashboard(id);
  }

  @RequirePermissions('projects.read')
  @Get(':id/kanban')
  getKanban(@Param('id') id: string) {
    return this.projectsService.getKanban(id);
  }

  @RequirePermissions('projects.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @RequirePermissions('projects.update')
  @Post(':id/phases/init-software')
  initSoftwarePhases(@Param('id') id: string) {
    return this.projectsService.initSoftwarePhases(id);
  }

  @RequirePermissions('projects.update')
  @Patch(':id/phases/:phaseId')
  updatePhase(
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectsService.updatePhase(id, phaseId, body as Parameters<ProjectsService['updatePhase']>[2]);
  }

  @RequirePermissions('projects.update')
  @Post(':id/issues')
  createIssue(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.projectsService.createIssue(id, body as Parameters<ProjectsService['createIssue']>[1]);
  }

  @RequirePermissions('projects.update')
  @Patch(':id/issues/:issueId')
  updateIssue(
    @Param('id') id: string,
    @Param('issueId') issueId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectsService.updateIssue(id, issueId, body as Parameters<ProjectsService['updateIssue']>[2]);
  }

  @RequirePermissions('projects.delete')
  @Delete(':id/issues/:issueId')
  removeIssue(@Param('id') id: string, @Param('issueId') issueId: string) {
    return this.projectsService.removeIssue(id, issueId);
  }

  @RequirePermissions('projects.update')
  @Post(':id/files')
  addFile(@Param('id') id: string, @Body() body: { name: string; fileUrl: string; type?: string; phaseId?: string }) {
    return this.projectsService.addProjectAsset(id, body);
  }

  @RequirePermissions('projects.create')
  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.projectsService.create(body as Parameters<ProjectsService['create']>[0]);
  }

  @RequirePermissions('projects.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.projectsService.update(id, body);
  }

  @RequirePermissions('projects.update')
  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() body: { userId: string; role?: string }) {
    return this.projectsService.addMember(id, body.userId, body.role);
  }

  @RequirePermissions('projects.update')
  @Post(':id/milestones')
  createMilestone(@Param('id') id: string, @Body() body: { title: string; description?: string; dueDate?: string }) {
    return this.projectsService.createMilestone(id, body);
  }

  @RequirePermissions('projects.update')
  @Post(':id/sprints')
  createSprint(@Param('id') id: string, @Body() body: { name: string; goal?: string; startDate: string; endDate: string }) {
    return this.projectsService.createSprint(id, body);
  }

  @RequirePermissions('projects.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
