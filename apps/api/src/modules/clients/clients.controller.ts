import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ClientsService } from './clients.service';
import {
  CreateClientAssetDto,
  CreateClientDto,
  CreatePackageDto,
  CreateSubscriptionDto,
  UpdateClientDto,
  UpdatePackageDto,
} from './dto/client.dto';

@ApiTags('CRM - Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @RequirePermissions('clients.read')
  @Get()
  findAll(@Query() query: PaginationDto, @Query('status') status?: string) {
    return this.clientsService.findAll(query, status);
  }

  @RequirePermissions('clients.read')
  @Get(':id/profile')
  getProfile(@Param('id') id: string) {
    return this.clientsService.getProfile(id);
  }

  @RequirePermissions('clients.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @RequirePermissions('clients.create')
  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser('id') userId: string) {
    return this.clientsService.create(dto, userId);
  }

  @RequirePermissions('clients.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto, @CurrentUser('id') userId: string) {
    return this.clientsService.update(id, dto, userId);
  }

  @RequirePermissions('clients.update')
  @Patch(':id/social-links')
  updateSocialLinks(
    @Param('id') id: string,
    @Body() body: { socialLinks: Record<string, string | Record<string, string>> },
    @CurrentUser('id') userId: string,
  ) {
    return this.clientsService.updateSocialLinks(id, body.socialLinks, userId);
  }

  @RequirePermissions('clients.delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.clientsService.remove(id, userId);
  }

  @RequirePermissions('clients.update')
  @Post(':id/packages')
  addPackage(@Param('id') id: string, @Body() dto: CreatePackageDto) {
    return this.clientsService.addPackage(id, dto);
  }

  @RequirePermissions('clients.update')
  @Post(':id/timeline')
  addTimeline(@Param('id') id: string, @Body() body: { type: string; title: string; content?: string }) {
    return this.clientsService.addTimeline(id, body);
  }

  @RequirePermissions('clients.update')
  @Post(':id/file-sections')
  addFileSection(
    @Param('id') id: string,
    @Body() body: { label: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.clientsService.addFileSection(id, body.label, userId);
  }

  @RequirePermissions('clients.update')
  @Patch(':id/file-sections/:key')
  renameFileSection(
    @Param('id') id: string,
    @Param('key') key: string,
    @Body() body: { label: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.clientsService.updateFileSection(id, key, body.label, userId);
  }

  @RequirePermissions('clients.update')
  @Delete(':id/file-sections/:key')
  removeFileSection(
    @Param('id') id: string,
    @Param('key') key: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clientsService.deleteFileSection(id, key, userId);
  }

  @RequirePermissions('clients.update')
  @Post(':id/assets')
  addAsset(@Param('id') id: string, @Body() dto: CreateClientAssetDto) {
    return this.clientsService.addAsset(id, dto);
  }

  @RequirePermissions('clients.update')
  @Patch(':id/packages/:packageId')
  updatePackage(
    @Param('id') id: string,
    @Param('packageId') packageId: string,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.clientsService.updatePackage(id, packageId, dto);
  }

  @RequirePermissions('clients.update')
  @Patch(':id/assets/:assetId')
  updateAsset(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @Body() dto: CreateClientAssetDto,
  ) {
    return this.clientsService.updateAsset(id, assetId, dto);
  }

  @RequirePermissions('clients.update')
  @Delete(':id/assets/:assetId')
  removeAsset(@Param('id') id: string, @Param('assetId') assetId: string) {
    return this.clientsService.removeAsset(id, assetId);
  }

  @RequirePermissions('clients.update')
  @Delete(':id/timeline/:timelineId')
  removeTimeline(@Param('id') id: string, @Param('timelineId') timelineId: string) {
    return this.clientsService.removeTimeline(id, timelineId);
  }

  @RequirePermissions('clients.update')
  @Post(':id/subscriptions')
  addSubscription(@Param('id') id: string, @Body() dto: CreateSubscriptionDto) {
    return this.clientsService.addSubscription(id, dto);
  }

  @RequirePermissions('clients.update')
  @Patch(':id/subscriptions/:subId')
  updateSubscription(
    @Param('id') id: string,
    @Param('subId') subId: string,
    @Body() body: Partial<CreateSubscriptionDto & { isActive: boolean }>,
  ) {
    return this.clientsService.updateSubscription(id, subId, body);
  }

  @RequirePermissions('clients.update')
  @Delete(':id/subscriptions/:subId')
  removeSubscription(@Param('id') id: string, @Param('subId') subId: string) {
    return this.clientsService.removeSubscription(id, subId);
  }
}
