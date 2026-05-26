import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @RequirePermissions('tasks.read')
  @Get()
  findAll(
    @Query() query: PaginationDto,
    @Query('projectId') projectId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: TaskStatus,
  ) {
    return this.tasksService.findAll(query, { projectId, assigneeId, status });
  }

  @RequirePermissions('tasks.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @RequirePermissions('tasks.create')
  @Post()
  create(@CurrentUser('id') userId: string, @Body() body: Record<string, unknown>) {
    return this.tasksService.create(userId, body as Parameters<TasksService['create']>[1]);
  }

  @RequirePermissions('tasks.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.tasksService.update(id, body);
  }

  @RequirePermissions('tasks.update')
  @Patch(':id/move')
  moveKanban(@Param('id') id: string, @Body() body: { status: TaskStatus; columnOrder: number }) {
    return this.tasksService.moveKanban(id, body.status, body.columnOrder);
  }

  @RequirePermissions('tasks.update')
  @Post(':id/comments')
  addComment(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() body: { content: string }) {
    return this.tasksService.addComment(id, userId, body.content);
  }

  @RequirePermissions('tasks.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
