import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus, TaskPriority } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationDto, filters?: { projectId?: string; assigneeId?: string; status?: TaskStatus }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where: Prisma.TaskWhereInput = { ...filters };

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        comments: { include: { author: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'asc' } },
        attachments: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(creatorId: string, data: {
    title: string; description?: string; projectId?: string; phaseId?: string; sprintId?: string;
    assigneeId?: string; status?: TaskStatus; priority?: TaskPriority;
    dueDate?: string; tags?: string[];
  }) {
    const maxOrder = await this.prisma.task.aggregate({
      where: { projectId: data.projectId, status: data.status || 'TODO' },
      _max: { columnOrder: true },
    });
    return this.prisma.task.create({
      data: {
        ...data,
        creatorId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        columnOrder: (maxOrder._max.columnOrder || 0) + 1,
      },
      include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.findOne(id);
    const updateData = { ...data } as Prisma.TaskUpdateInput;
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate as string);
    if (data.status === 'DONE') updateData.completedAt = new Date();
    return this.prisma.task.update({ where: { id }, data: updateData });
  }

  async moveKanban(id: string, status: TaskStatus, columnOrder: number) {
    return this.prisma.task.update({ where: { id }, data: { status, columnOrder } });
  }

  async addComment(taskId: string, authorId: string, content: string) {
    return this.prisma.comment.create({
      data: { taskId, authorId, content },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.task.delete({ where: { id } });
    return { message: 'Task deleted' };
  }
}
