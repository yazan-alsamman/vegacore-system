import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { MarketingService } from './marketing.service';

@ApiTags('Marketing')
@ApiBearerAuth()
@Controller('marketing')
export class MarketingController {
  constructor(private marketingService: MarketingService) {}

  @RequirePermissions('marketing.read')
  @Get('calendar')
  getCalendar(@Query() query: PaginationDto, @Query('status') status?: ContentStatus) {
    return this.marketingService.getCalendar(query, status);
  }

  @RequirePermissions('marketing.read')
  @Get('workspace')
  getWorkspace(@Query('clientId') clientId?: string) {
    return this.marketingService.getWorkspace(clientId);
  }

  @RequirePermissions('marketing.create')
  @Post('calendar')
  createContent(@Body() body: Record<string, unknown>) {
    return this.marketingService.createContent(body as Parameters<MarketingService['createContent']>[0]);
  }

  @RequirePermissions('marketing.update')
  @Patch('calendar/:id')
  updateContent(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.marketingService.updateContent(id, body);
  }

  @RequirePermissions('marketing.read')
  @Get('campaigns')
  getCampaigns() {
    return this.marketingService.getCampaigns();
  }

  @RequirePermissions('marketing.create')
  @Post('campaigns')
  createCampaign(@Body() body: Record<string, unknown>) {
    return this.marketingService.createCampaign(body as Parameters<MarketingService['createCampaign']>[0]);
  }

  @RequirePermissions('marketing.read')
  @Get('scripts')
  getScripts(@Query('clientId') clientId?: string) {
    return this.marketingService.getScripts(clientId);
  }

  @RequirePermissions('marketing.create')
  @Post('scripts')
  createScript(@Body() body: Record<string, unknown>) {
    return this.marketingService.createScript(body as Parameters<MarketingService['createScript']>[0]);
  }

  @RequirePermissions('marketing.update')
  @Patch('scripts/:id')
  updateScript(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.marketingService.updateScript(id, body);
  }

  @RequirePermissions('marketing.update')
  @Patch('campaigns/:id')
  updateCampaign(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.marketingService.updateCampaign(id, body);
  }

  @RequirePermissions('marketing.delete')
  @Delete('calendar/:id')
  removeContent(@Param('id') id: string) {
    return this.marketingService.removeContent(id);
  }

  @RequirePermissions('marketing.delete')
  @Delete('campaigns/:id')
  removeCampaign(@Param('id') id: string) {
    return this.marketingService.removeCampaign(id);
  }

  @RequirePermissions('marketing.delete')
  @Delete('scripts/:id')
  removeScript(@Param('id') id: string) {
    return this.marketingService.removeScript(id);
  }
}
