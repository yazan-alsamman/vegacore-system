import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShootStatus } from '@prisma/client';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { MediaService } from './media.service';

@ApiTags('Media Production')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @RequirePermissions('media.read')
  @Get('shoots')
  getShoots(@Query() query: PaginationDto, @Query('status') status?: ShootStatus) {
    return this.mediaService.getShoots(query, status);
  }

  @RequirePermissions('media.read')
  @Get('shoots/:id')
  getShoot(@Param('id') id: string) {
    return this.mediaService.getShoot(id);
  }

  @RequirePermissions('media.create')
  @Post('shoots')
  createShoot(@Body() body: Record<string, unknown>) {
    return this.mediaService.createShoot(body as Parameters<MediaService['createShoot']>[0]);
  }

  @RequirePermissions('media.update')
  @Patch('shoots/:id')
  updateShoot(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.mediaService.updateShoot(id, body);
  }

  @RequirePermissions('media.create')
  @Post('videos')
  createVideo(@Body() body: Record<string, unknown>) {
    return this.mediaService.createVideo(body as Parameters<MediaService['createVideo']>[0]);
  }

  @RequirePermissions('media.update')
  @Patch('videos/:id')
  updateVideo(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.mediaService.updateVideo(id, body as Parameters<MediaService['updateVideo']>[1]);
  }

  @RequirePermissions('media.delete')
  @Delete('shoots/:id')
  removeShoot(@Param('id') id: string) {
    return this.mediaService.removeShoot(id);
  }

  @RequirePermissions('media.delete')
  @Delete('videos/:id')
  removeVideo(@Param('id') id: string) {
    return this.mediaService.removeVideo(id);
  }
}
