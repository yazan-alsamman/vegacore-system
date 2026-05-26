import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

type MediaItem = { url: string; title?: string };
type ProjectItem = { name: string; client?: string; year?: string; url?: string };
type Availability = Record<string, { from?: string; to?: string; available?: boolean }>;

@Injectable()
export class ModelsService {
  constructor(private prisma: PrismaService) {}

  getEligibleUsers() {
    return this.prisma.user.findMany({
      where: { modelProfile: null },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: 'asc' },
      take: 200,
    });
  }

  findAll() {
    return this.prisma.modelProfile.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, phone: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const model = await this.prisma.modelProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, phone: true } },
        bookings: { orderBy: { startTime: 'desc' }, include: { shoot: { select: { id: true, title: true, location: true } } } },
      },
    });
    if (!model) throw new NotFoundException('Model not found');
    return model;
  }

  async getProfile(id: string) {
    const model = await this.findOne(id);
    const now = new Date();
    const upcoming = model.bookings.filter((b) => new Date(b.startTime) >= now);
    const past = model.bookings.filter((b) => new Date(b.startTime) < now);

    return {
      ...model,
      photos: (model.photos as MediaItem[]) || [],
      videos: (model.videos as MediaItem[]) || [],
      previousProjects: (model.previousProjects as ProjectItem[]) || [],
      availability: (model.availability as Availability) || {},
      measurements: (model.measurements as Record<string, string>) || {},
      rates: { ...((model.rates as Record<string, number | string>) || {}), currency: 'USD' },
      stats: {
        totalBookings: model.bookings.length,
        upcomingBookings: upcoming.length,
        completedBookings: past.length,
      },
      upcomingBookings: upcoming,
      bookingHistory: past,
    };
  }

  async create(data: {
    userId: string;
    bio?: string;
    contentTypes?: string[];
    measurements?: Record<string, unknown>;
    rates?: Record<string, unknown>;
    photos?: MediaItem[];
    videos?: MediaItem[];
    availability?: Availability;
    previousProjects?: ProjectItem[];
  }) {
    const existing = await this.prisma.modelProfile.findUnique({ where: { userId: data.userId } });
    if (existing) throw new ConflictException('This user already has a model profile');

    return this.prisma.modelProfile.create({
      data: {
        userId: data.userId,
        bio: data.bio,
        contentTypes: data.contentTypes || [],
        measurements: data.measurements as Prisma.InputJsonValue,
        rates: { ...(data.rates || {}), currency: 'USD' } as Prisma.InputJsonValue,
        photos: (data.photos || []) as Prisma.InputJsonValue,
        videos: (data.videos || []) as Prisma.InputJsonValue,
        availability: data.availability as Prisma.InputJsonValue,
        previousProjects: (data.previousProjects || []) as Prisma.InputJsonValue,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });
  }

  async createWithUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    bio?: string;
    contentTypes?: string[];
    measurements?: Record<string, unknown>;
    rates?: Record<string, unknown>;
    availability?: Availability;
  }) {
    const modelRole = await this.prisma.role.findUnique({ where: { slug: 'model' } });
    if (!modelRole) throw new NotFoundException('Model role not found');

    const email = data.email.toLowerCase();
    const dup = await this.prisma.user.findUnique({ where: { email } });
    if (dup) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          roleId: modelRole.id,
          locale: 'ar',
        },
      });
      return tx.modelProfile.create({
        data: {
          userId: user.id,
          bio: data.bio,
          contentTypes: data.contentTypes || [],
          measurements: data.measurements as Prisma.InputJsonValue,
          rates: { ...(data.rates || {}), currency: 'USD' } as Prisma.InputJsonValue,
          availability: data.availability as Prisma.InputJsonValue,
          photos: [] as Prisma.InputJsonValue,
          videos: [] as Prisma.InputJsonValue,
          previousProjects: [] as Prisma.InputJsonValue,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      });
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    const model = await this.findOne(id);
    const payload: Prisma.ModelProfileUpdateInput = {};

    const userPatch: Prisma.UserUpdateInput = {};
    if (data.firstName !== undefined) userPatch.firstName = data.firstName as string;
    if (data.lastName !== undefined) userPatch.lastName = data.lastName as string;
    if (data.phone !== undefined) userPatch.phone = data.phone as string;
    if (data.email !== undefined) userPatch.email = (data.email as string).toLowerCase();
    if (Object.keys(userPatch).length) {
      await this.prisma.user.update({ where: { id: model.user.id }, data: userPatch });
    }

    if (data.bio !== undefined) payload.bio = data.bio as string;
    if (data.contentTypes !== undefined) payload.contentTypes = data.contentTypes as string[];
    if (data.measurements !== undefined) payload.measurements = data.measurements as Prisma.InputJsonValue;
    if (data.rates !== undefined) {
      payload.rates = { ...(data.rates as Record<string, unknown>), currency: 'USD' } as Prisma.InputJsonValue;
    }
    if (data.photos !== undefined) payload.photos = data.photos as Prisma.InputJsonValue;
    if (data.videos !== undefined) payload.videos = data.videos as Prisma.InputJsonValue;
    if (data.availability !== undefined) payload.availability = data.availability as Prisma.InputJsonValue;
    if (data.previousProjects !== undefined) payload.previousProjects = data.previousProjects as Prisma.InputJsonValue;

    return this.prisma.modelProfile.update({
      where: { id },
      data: payload,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  createBooking(modelId: string, data: { shootId?: string; startTime: string; endTime: string; notes?: string; status?: string }) {
    return this.prisma.modelBooking.create({
      data: {
        modelId,
        shootId: data.shootId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        notes: data.notes,
        status: data.status || 'confirmed',
      },
      include: { shoot: { select: { id: true, title: true } } },
    });
  }

  async updateBooking(modelId: string, bookingId: string, data: Record<string, unknown>) {
    const booking = await this.prisma.modelBooking.findFirst({ where: { id: bookingId, modelId } });
    if (!booking) throw new NotFoundException('Booking not found');

    return this.prisma.modelBooking.update({
      where: { id: bookingId },
      data: {
        ...(data.shootId !== undefined ? { shootId: data.shootId as string | null } : {}),
        ...(data.startTime ? { startTime: new Date(data.startTime as string) } : {}),
        ...(data.endTime ? { endTime: new Date(data.endTime as string) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes as string } : {}),
        ...(data.status !== undefined ? { status: data.status as string } : {}),
      },
      include: { shoot: { select: { id: true, title: true } } },
    });
  }

  async removeBooking(modelId: string, bookingId: string) {
    const booking = await this.prisma.modelBooking.findFirst({ where: { id: bookingId, modelId } });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.prisma.modelBooking.delete({ where: { id: bookingId } });
    return { message: 'Booking deleted' };
  }

  getAvailability(modelId: string, from: string, to: string) {
    return this.prisma.modelBooking.findMany({
      where: {
        modelId,
        startTime: { gte: new Date(from) },
        endTime: { lte: new Date(to) },
      },
      orderBy: { startTime: 'asc' },
      include: { shoot: { select: { id: true, title: true } } },
    });
  }

  async remove(id: string) {
    await this.prisma.modelBooking.deleteMany({ where: { modelId: id } });
    await this.prisma.modelProfile.delete({ where: { id } });
    return { message: 'Model profile deleted' };
  }
}
