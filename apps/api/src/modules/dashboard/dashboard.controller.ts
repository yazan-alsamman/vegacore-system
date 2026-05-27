import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @RequirePermissions('dashboard.read')
  @Get('executive')
  getExecutive(@CurrentUser('permissions') permissions: string[]) {
    return this.dashboardService.getExecutiveDashboard(permissions);
  }
}
