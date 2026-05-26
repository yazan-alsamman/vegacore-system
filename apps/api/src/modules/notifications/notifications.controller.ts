import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('center')
  getCenter(@CurrentUser() user: { id: string; permissions: string[] }) {
    return this.notificationsService.getCenter(user);
  }

  @Get()
  getAll(@CurrentUser('id') userId: string, @Query('unread') unread?: string) {
    return this.notificationsService.getForUser(userId, unread === 'true');
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markRead(id, userId);
  }
}
