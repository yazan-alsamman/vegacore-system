import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { MediaModule } from './modules/media/media.module';
import { ModelsModule } from './modules/models/models.module';
import { HrModule } from './modules/hr/hr.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ArchiveModule } from './modules/archive/archive.module';
import { AiModule } from './modules/ai/ai.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { ChatModule } from './modules/chat/chat.module';
import { SecurityModule } from './modules/security/security.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    RbacModule,
    ClientsModule,
    ProjectsModule,
    TasksModule,
    MarketingModule,
    MediaModule,
    ModelsModule,
    HrModule,
    FinanceModule,
    ArchiveModule,
    AiModule,
    DashboardModule,
    NotificationsModule,
    AuditModule,
    ChatModule,
    SecurityModule,
    ReportsModule,
    CalendarModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
