import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AssetType } from '@prisma/client';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ArchiveCategory, ArchiveService } from './archive.service';

@ApiTags('Archive')
@ApiBearerAuth()
@Controller('archive')
export class ArchiveController {
  constructor(private archiveService: ArchiveService) {}

  @RequirePermissions('archive.read')
  @Get('workspace')
  getWorkspace(
    @Query('search') search?: string,
    @Query('category') category?: ArchiveCategory,
    @Query('type') type?: AssetType,
    @Query('clientId') clientId?: string,
    @Query('projectId') projectId?: string,
    @Query('tags') tags?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.archiveService.getWorkspace({
      search,
      category,
      type,
      clientId,
      projectId,
      tags,
      dateFrom,
      dateTo,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 48,
    });
  }

  @RequirePermissions('archive.read')
  @Get('tags')
  getTags() {
    return this.archiveService.getTags();
  }

  @RequirePermissions('archive.read')
  @Get('stats')
  getStats() {
    return this.archiveService.getStats();
  }

  @RequirePermissions('archive.read')
  @Get('assets')
  search(
    @Query() query: PaginationDto,
    @Query('type') type?: AssetType,
    @Query('clientId') clientId?: string,
    @Query('projectId') projectId?: string,
    @Query('tags') tags?: string,
    @Query('category') category?: ArchiveCategory,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.archiveService.search(query, { type, clientId, projectId, tags, category, dateFrom, dateTo });
  }

  @RequirePermissions('archive.read')
  @Get('assets/:id')
  getAsset(@Param('id') id: string) {
    return this.archiveService.getAsset(id);
  }

  @RequirePermissions('archive.create')
  @Post('assets')
  createAsset(@Body() body: Record<string, unknown>) {
    return this.archiveService.createAsset(body as Parameters<ArchiveService['createAsset']>[0]);
  }

  @RequirePermissions('archive.update')
  @Patch('assets/:id')
  updateAsset(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.archiveService.updateAsset(id, body);
  }

  @RequirePermissions('archive.update')
  @Post('assets/:id/versions')
  addVersion(@Param('id') id: string, @Body() body: { fileUrl: string; notes?: string }) {
    return this.archiveService.addVersion(id, body);
  }

  @RequirePermissions('archive.read')
  @Get('contracts')
  getContracts(@Query('clientId') clientId?: string) {
    return this.archiveService.getContracts(clientId);
  }

  @RequirePermissions('archive.create')
  @Post('contracts')
  createContract(@Body() body: Record<string, unknown>) {
    return this.archiveService.createContract(body as Parameters<ArchiveService['createContract']>[0]);
  }

  @RequirePermissions('archive.update')
  @Patch('contracts/:id')
  updateContract(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.archiveService.updateContract(id, body);
  }

  @RequirePermissions('archive.update')
  @Post('projects/:id/archive')
  archiveProject(@Param('id') id: string) {
    return this.archiveService.archiveProject(id);
  }

  @RequirePermissions('archive.delete')
  @Delete('assets/:id')
  removeAsset(@Param('id') id: string) {
    return this.archiveService.removeAsset(id);
  }

  @RequirePermissions('archive.delete')
  @Delete('contracts/:id')
  removeContract(@Param('id') id: string) {
    return this.archiveService.removeContract(id);
  }
}
