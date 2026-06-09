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

type AuthUser = {
  id: string;
  role?: string;
  clientId?: string | null;
  permissions?: string[];
};

@ApiTags('CRM - Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @RequirePermissions('clients.read')
  @Get()
  findAll(
    @Query() query: PaginationDto,
    @Query('status') status: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clientsService.findAll(query, status, user);
  }

  @RequirePermissions('clients.read')
  @Get('marketing-managers/options')
  listMarketingManagers() {
    return this.clientsService.listMarketingManagers();
  }

  @RequirePermissions('clients.read')
  @Get(':id/profile')
  async getProfile(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.getProfile(id, user.permissions || []);
  }

  @RequirePermissions('clients.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.findOne(id, user.permissions || []);
  }

  @RequirePermissions('clients.create')
  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser('id') userId: string) {
    return this.clientsService.create(dto, userId);
  }

  @RequirePermissions('clients.update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.update(id, dto, user.id);
  }

  @RequirePermissions('clients.update')
  @Patch(':id/social-links')
  async updateSocialLinks(
    @Param('id') id: string,
    @Body() body: { socialLinks: Record<string, string | Record<string, string>> },
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.updateSocialLinks(id, body.socialLinks, user.id);
  }

  @RequirePermissions('clients.delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.clientsService.remove(id, userId);
  }

  @RequirePermissions('clients.update')
  @Post(':id/packages')
  async addPackage(@Param('id') id: string, @Body() dto: CreatePackageDto, @CurrentUser() user: AuthUser) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.addPackage(id, dto);
  }

  @RequirePermissions('clients.update')
  @Post(':id/timeline')
  async addTimeline(
    @Param('id') id: string,
    @Body() body: { type: string; title: string; content?: string },
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.addTimeline(id, body);
  }

  @RequirePermissions('clients.update')
  @Post(':id/file-sections')
  async addFileSection(
    @Param('id') id: string,
    @Body() body: { label: string },
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.addFileSection(id, body.label, user.id);
  }

  @RequirePermissions('clients.update')
  @Patch(':id/file-sections/:key')
  async renameFileSection(
    @Param('id') id: string,
    @Param('key') key: string,
    @Body() body: { label: string },
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.updateFileSection(id, key, body.label, user.id);
  }

  @RequirePermissions('clients.update')
  @Delete(':id/file-sections/:key')
  async removeFileSection(
    @Param('id') id: string,
    @Param('key') key: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.deleteFileSection(id, key, user.id);
  }

  @RequirePermissions('clients.update')
  @Post(':id/assets')
  async addAsset(@Param('id') id: string, @Body() dto: CreateClientAssetDto, @CurrentUser() user: AuthUser) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.addAsset(id, dto);
  }

  @RequirePermissions('clients.update')
  @Patch(':id/packages/:packageId')
  async updatePackage(
    @Param('id') id: string,
    @Param('packageId') packageId: string,
    @Body() dto: UpdatePackageDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.updatePackage(id, packageId, dto);
  }

  @RequirePermissions('clients.update')
  @Patch(':id/assets/:assetId')
  async updateAsset(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @Body() dto: CreateClientAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.updateAsset(id, assetId, dto);
  }

  @RequirePermissions('clients.update')
  @Delete(':id/assets/:assetId')
  async removeAsset(@Param('id') id: string, @Param('assetId') assetId: string, @CurrentUser() user: AuthUser) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.removeAsset(id, assetId);
  }

  @RequirePermissions('clients.update')
  @Delete(':id/timeline/:timelineId')
  async removeTimeline(
    @Param('id') id: string,
    @Param('timelineId') timelineId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.removeTimeline(id, timelineId);
  }

  @RequirePermissions('clients.update')
  @Post(':id/subscriptions')
  async addSubscription(
    @Param('id') id: string,
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.addSubscription(id, dto);
  }

  @RequirePermissions('clients.update')
  @Patch(':id/subscriptions/:subId')
  async updateSubscription(
    @Param('id') id: string,
    @Param('subId') subId: string,
    @Body() body: Partial<CreateSubscriptionDto & { isActive: boolean }>,
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.updateSubscription(id, subId, body);
  }

  @RequirePermissions('clients.update')
  @Delete(':id/subscriptions/:subId')
  async removeSubscription(
    @Param('id') id: string,
    @Param('subId') subId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.clientsService.assertClientAccess(user, id);
    return this.clientsService.removeSubscription(id, subId);
  }
}
