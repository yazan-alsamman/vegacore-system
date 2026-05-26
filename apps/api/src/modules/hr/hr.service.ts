import { Injectable } from '@nestjs/common';
import { LeaveStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  getEmployees() {
    return this.prisma.employeeProfile.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, status: true, role: { select: { name: true } } } },
      },
    });
  }

  getEmployee(id: string) {
    return this.prisma.employeeProfile.findUnique({
      where: { id },
      include: {
        user: { include: { role: true } },
        attendance: { orderBy: { checkIn: 'desc' }, take: 30 },
        performanceReports: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  checkIn(employeeId: string) {
    return this.prisma.attendance.create({ data: { employeeId, checkIn: new Date() } });
  }

  checkOut(attendanceId: string) {
    return this.prisma.attendance.update({ where: { id: attendanceId }, data: { checkOut: new Date() } });
  }

  createLeaveRequest(userId: string, data: { startDate: string; endDate: string; reason?: string }) {
    return this.prisma.leaveRequest.create({
      data: { userId, ...data, startDate: new Date(data.startDate), endDate: new Date(data.endDate) },
    });
  }

  getLeaveRequests(status?: LeaveStatus) {
    return this.prisma.leaveRequest.findMany({
      where: status ? { status } : {},
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  reviewLeave(id: string, status: LeaveStatus) {
    return this.prisma.leaveRequest.update({ where: { id }, data: { status } });
  }

  createPerformanceReport(employeeId: string, data: { period: string; score: number; feedback?: string; metrics?: Record<string, unknown> }) {
    return this.prisma.performanceReport.create({
      data: { employeeId, ...data, metrics: data.metrics as Prisma.InputJsonValue },
    });
  }
}
