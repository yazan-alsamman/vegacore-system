import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        modelProfile: { select: { id: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    await this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'user',
      entityId: user.id,
      ipAddress: ip,
      userAgent,
    });

    const permissions = user.role.permissions.map((rp) => rp.permission.slug);
    if (user.role.slug === 'super-admin') permissions.push('*');

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.slug,
        roleName: user.role.name,
        locale: user.locale,
        permissions,
        modelProfile: user.modelProfile,
      },
      ...tokens,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: dto.roleId,
      },
      include: { role: true },
    });

    return { id: user.id, email: user.email, role: user.role.name };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.generateTokens(stored.userId, stored.user.email);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId },
        data: { revoked: true },
      });
    }
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'user',
      entityId: userId,
      newData: { passwordChanged: true },
    });

    return { message: 'Password updated successfully' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        employeeProfile: true,
        modelProfile: true,
      },
    });
    if (!user) throw new UnauthorizedException();

    const permissions = user.role.permissions.map((rp) => rp.permission.slug);
    if (user.role.slug === 'super-admin') permissions.push('*');

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      locale: user.locale,
      role: user.role.slug,
      roleName: user.role.name,
      permissions,
      employeeProfile: user.employeeProfile,
      modelProfile: user.modelProfile,
    };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload);

    const refreshToken = uuidv4();
    const refreshExpires = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date();
    const days = parseInt(refreshExpires.replace('d', ''), 10) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: { userId, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken, expiresIn: this.config.get('JWT_EXPIRES_IN', '15m') };
  }
}
