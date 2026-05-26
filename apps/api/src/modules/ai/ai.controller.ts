import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AiService } from './ai.service';

@ApiTags('AI Automation')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @RequirePermissions('ai.read')
  @Get('status')
  getStatus() {
    return this.aiService.getStatus();
  }

  @RequirePermissions('ai.use')
  @Post('script-generator')
  generateScript(@CurrentUser('id') userId: string, @Body() body: Record<string, unknown>) {
    return this.aiService.process('script-generator', body, userId);
  }

  @RequirePermissions('ai.use')
  @Post('content-planner')
  planContent(@CurrentUser('id') userId: string, @Body() body: Record<string, unknown>) {
    return this.aiService.process('content-planner', body, userId);
  }

  @RequirePermissions('ai.use')
  @Post('task-distribution')
  distributeTasks(@CurrentUser('id') userId: string, @Body() body: Record<string, unknown>) {
    return this.aiService.process('task-distribution', body, userId);
  }

  @RequirePermissions('ai.use')
  @Post('client-analyzer')
  analyzeClient(@CurrentUser('id') userId: string, @Body() body: Record<string, unknown>) {
    return this.aiService.process('client-analyzer', body, userId);
  }

  @RequirePermissions('ai.use')
  @Post('bug-analyzer')
  analyzeBug(@CurrentUser('id') userId: string, @Body() body: Record<string, unknown>) {
    return this.aiService.process('bug-analyzer', body, userId);
  }

  @RequirePermissions('ai.read')
  @Get('history')
  getHistory(@CurrentUser('id') userId: string, @Query('type') type?: string) {
    return this.aiService.getHistory(userId, type);
  }
}
