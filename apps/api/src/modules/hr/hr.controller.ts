import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LeaveStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { HrService } from './hr.service';

@ApiTags('HR')
@ApiBearerAuth()
@Controller('hr')
export class HrController {
  constructor(private hrService: HrService) {}

  @RequirePermissions('hr.read')
  @Get('employees')
  getEmployees() {
    return this.hrService.getEmployees();
  }

  @RequirePermissions('hr.read')
  @Get('employees/:id')
  getEmployee(@Param('id') id: string) {
    return this.hrService.getEmployee(id);
  }

  @RequirePermissions('hr.update')
  @Post('attendance/check-in')
  checkIn(@Body() body: { employeeId: string }) {
    return this.hrService.checkIn(body.employeeId);
  }

  @RequirePermissions('hr.update')
  @Post('attendance/:id/check-out')
  checkOut(@Param('id') id: string) {
    return this.hrService.checkOut(id);
  }

  @Post('leave')
  createLeave(@CurrentUser('id') userId: string, @Body() body: { startDate: string; endDate: string; reason?: string }) {
    return this.hrService.createLeaveRequest(userId, body);
  }

  @RequirePermissions('hr.read')
  @Get('leave')
  getLeave(@Query('status') status?: LeaveStatus) {
    return this.hrService.getLeaveRequests(status);
  }

  @RequirePermissions('hr.manage')
  @Patch('leave/:id')
  reviewLeave(@Param('id') id: string, @Body() body: { status: LeaveStatus }) {
    return this.hrService.reviewLeave(id, body.status);
  }

  @RequirePermissions('hr.manage')
  @Post('employees/:id/performance')
  createPerformance(@Param('id') id: string, @Body() body: { period: string; score: number; feedback?: string }) {
    return this.hrService.createPerformanceReport(id, body);
  }
}
