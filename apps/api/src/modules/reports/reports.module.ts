import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { FinanceModule } from '../finance/finance.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [DashboardModule, FinanceModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
