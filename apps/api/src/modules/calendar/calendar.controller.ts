import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CalendarService } from './calendar.service';

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @RequirePermissions('calendar.read')
  @Get('events')
  getEvents(
    @CurrentUser() user: { id: string; permissions: string[] },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.calendarService.getEvents(user, from, to);
  }
}
