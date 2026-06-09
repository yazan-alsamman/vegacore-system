import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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

  /** HR team list — all staff accounts (not clients/models). */
  async findTeam(callerRole?: string) {
    const excludeSlugs =
      callerRole === 'super-admin' ? ['client', 'model'] : ['client', 'model', 'super-admin'];

    return this.prisma.user.findMany({
      where: { role: { slug: { notIn: excludeSlugs } } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        locale: true,
        createdAt: true,
        role: { select: { id: true, name: true, slug: true } },
        employeeProfile: { select: { department: true } },
      },
    });
  }

  listAssignableRoles(callerRole?: string) {
    const exclude = callerRole === 'super-admin'
      ? ['client', 'model']
      : ['super-admin', 'client', 'model'];
    return this.prisma.role.findMany({
      where: { slug: { notIn: exclude } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      roleId: string;
      phone?: string;
      department?: string;
    },
    callerRole?: string,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');

    const role = await this.prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.slug === 'super-admin' && callerRole !== 'super-admin') {
      throw new ForbiddenException('Only super admins can create super admin accounts');
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

  async update(id: string, data: UpdateUserDto, callerRole?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, employeeProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role.slug === 'super-admin' && callerRole !== 'super-admin') {
      throw new ForbiddenException('Only super admins can edit super admin accounts');
    }

    const patch: Prisma.UserUpdateInput = {};

    if (data.firstName !== undefined) patch.firstName = data.firstName.trim();
    if (data.lastName !== undefined) patch.lastName = data.lastName.trim();
    if (data.phone !== undefined) patch.phone = data.phone.trim() || null;
    if (data.status !== undefined) patch.status = data.status;

    if (data.email !== undefined) {
      const email = data.email.toLowerCase().trim();
      const dup = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (dup) throw new ConflictException('Email already registered');
      patch.email = email;
    }

    if (data.roleId !== undefined) {
      const role = await this.prisma.role.findUnique({ where: { id: data.roleId } });
      if (!role) throw new NotFoundException('Role not found');
      if (role.slug === 'super-admin' && callerRole !== 'super-admin') {
        throw new ForbiddenException('Only super admins can assign the super admin role');
      }
      patch.role = { connect: { id: role.id } };
    }

    if (data.password?.trim()) {
      patch.passwordHash = await bcrypt.hash(data.password, 12);
    }

    const nextRoleSlug = data.roleId
      ? (await this.prisma.role.findUnique({ where: { id: data.roleId }, select: { slug: true } }))?.slug
      : user.role.slug;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: patch });

      if (data.department !== undefined && nextRoleSlug && nextRoleSlug !== 'client' && nextRoleSlug !== 'model') {
        const dept = data.department.trim() || undefined;
        if (user.employeeProfile) {
          await tx.employeeProfile.update({ where: { userId: id }, data: { department: dept } });
        } else {
          await tx.employeeProfile.create({ data: { userId: id, department: dept } });
        }
      }
    });

    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        role: { select: { id: true, name: true, slug: true } },
        employeeProfile: { select: { department: true } },
      },
    });
  }

  async remove(id: string) {
    await this.prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });
    return { message: 'User deactivated' };
  }
}
