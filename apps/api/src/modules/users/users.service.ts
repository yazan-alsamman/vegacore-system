import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { firstName: { contains: query.search, mode: 'insensitive' as const } },
            { lastName: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          phone: true, status: true, locale: true, createdAt: true,
          role: { select: { id: true, name: true, slug: true } },
          employeeProfile: { select: { department: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  listAssignableRoles() {
    return this.prisma.role.findMany({
      where: { slug: { notIn: ['super-admin', 'client', 'model'] } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: string;
    phone?: string;
    department?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');

    const role = await this.prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.slug === 'super-admin') {
      throw new ConflictException('Cannot create super admin accounts from this form');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          roleId: data.roleId,
          phone: data.phone,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          role: { select: { id: true, name: true, slug: true } },
        },
      });

      if (role.slug !== 'client' && role.slug !== 'model') {
        await tx.employeeProfile.create({
          data: {
            userId: user.id,
            department: data.department?.trim() || undefined,
          },
        });
      }

      return user;
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, employeeProfile: true, modelProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async update(id: string, data: Record<string, unknown>) {
    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password as string, 12);
      delete data.password;
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, status: true },
    });
  }

  async remove(id: string) {
    await this.prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });
    return { message: 'User deactivated' };
  }
}
