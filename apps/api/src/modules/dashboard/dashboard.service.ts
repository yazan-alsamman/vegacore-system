import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private monthRange(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  private canFinance(permissions: string[] = []) {
    return permissions.includes('*') || permissions.includes('finance.read');
  }

  async getExecutiveDashboard(permissions: string[] = []) {
    const now = new Date();
    const { start: startOfMonth, end: endOfMonth } = this.monthRange(now);

    const [
      projects,
      delayedTasksList,
      teamWorkload,
      recentActivities,
      taskStats,
      clientStats,
      projectStats,
      monthlyRevenue,
      monthlyExpenses,
      monthlyPayroll,
      overdueInvoices,
      allInvoiced,
      paidInvoices,
      performanceReports,
      revenueByMonth,
      pendingApprovals,
    ] = await Promise.all([
      this.prisma.project.findMany({
        include: {
          client: { select: { id: true, companyName: true } },
          _count: { select: { tasks: true } },
          tasks: {
            where: { status: { not: 'DONE' } },
            select: { id: true, status: true, dueDate: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      this.prisma.task.findMany({
        where: { status: { not: 'DONE' }, dueDate: { lt: now } },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { firstName: true, lastName: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      this.prisma.employeeProfile.findMany({
        select: {
          id: true,
          workload: true,
          department: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { workload: 'desc' },
      }),
      this.prisma.activity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.task.groupBy({ by: ['status'], _count: true }),
      this.prisma.client.groupBy({ by: ['status'], _count: true }),
      this.prisma.project.groupBy({ by: ['status'], _count: true }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED', paidAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.payroll.aggregate({
        where: { paidAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.invoice.findMany({
        where: { status: { in: ['SENT', 'OVERDUE'] } },
        include: { client: { select: { id: true, companyName: true, email: true } } },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      this.prisma.invoice.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.performanceReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          employee: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
      this.getRevenueByMonth(6),
      this.prisma.approval.count({ where: { status: 'PENDING' } }),
    ]);

    const revenue = monthlyRevenue._sum.amount || 0;
    const expenses = (monthlyExpenses._sum.amount || 0) + (monthlyPayroll._sum.amount || 0);
    const monthlyProfit = revenue - expenses;

    const totalInvoiced = allInvoiced._sum.total || 0;
    const totalCollected = paidInvoices._sum.total || 0;
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    const overdueAmount = overdueInvoices.reduce((s, inv) => s + inv.total, 0);

    const projectsMapped = projects.map((p) => {
      const delayedTaskCount = p.tasks.filter((t) => t.dueDate && t.dueDate < now).length;
      const isDelayed =
        (p.endDate && p.endDate < now && !['COMPLETED', 'ARCHIVED', 'CANCELLED'].includes(p.status)) ||
        delayedTaskCount > 0;
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
        priority: p.priority,
        endDate: p.endDate,
        client: p.client,
        taskCount: p._count.tasks,
        openTasks: p.tasks.length,
        delayedTasks: delayedTaskCount,
        isDelayed,
      };
    });

    const delayedTasks = delayedTasksList.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      daysOverdue: t.dueDate ? Math.ceil((now.getTime() - t.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      project: t.project,
      assignee: t.assignee
        ? `${t.assignee.firstName} ${t.assignee.lastName}`
        : null,
    }));

    const employeeTaskCounts = await this.prisma.task.groupBy({
      by: ['assigneeId'],
      where: { status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED'] }, assigneeId: { not: null } },
      _count: true,
    });
    const taskCountMap = Object.fromEntries(
      employeeTaskCounts.map((e) => [e.assigneeId!, e._count]),
    );

    const busyEmployees = teamWorkload
      .map((emp) => {
        const activeTasks = taskCountMap[emp.user.id] || 0;
        const busy = emp.workload >= 3 || activeTasks >= 4;
        return {
          id: emp.id,
          name: `${emp.user.firstName} ${emp.user.lastName}`,
          department: emp.department,
          workload: emp.workload,
          activeTasks,
          busy,
        };
      })
      .sort((a, b) => b.activeTasks - a.activeTasks || b.workload - a.workload);

    const overdueByClient = overdueInvoices.reduce<
      Record<string, { clientId: string; companyName: string; totalDue: number; invoiceCount: number; oldestDue?: Date }>
    >((acc, inv) => {
      const cid = inv.clientId;
      if (!acc[cid]) {
        acc[cid] = {
          clientId: cid,
          companyName: inv.client.companyName,
          totalDue: 0,
          invoiceCount: 0,
          oldestDue: inv.dueDate || undefined,
        };
      }
      acc[cid].totalDue += inv.total;
      acc[cid].invoiceCount += 1;
      if (inv.dueDate && (!acc[cid].oldestDue || inv.dueDate < acc[cid].oldestDue!)) {
        acc[cid].oldestDue = inv.dueDate;
      }
      return acc;
    }, {});

    const avgPerformance =
      performanceReports.length > 0
        ? Math.round(
            performanceReports.reduce((s, r) => s + r.score, 0) / performanceReports.length,
          )
        : null;

    const activeProjects = projects.filter((p) => p.status === 'IN_PROGRESS').length;
    const delayedProjects = projectsMapped.filter((p) => p.isDelayed).length;

    const includeFinance = this.canFinance(permissions);

    const result = {
      overview: {
        totalProjects: projects.length,
        activeProjects,
        delayedProjects,
        delayedTasks: delayedTasks.length,
        activeClients: await this.prisma.client.count({ where: { status: 'ACTIVE' } }),
        monthlyRevenue: revenue,
        monthlyExpenses: monthlyExpenses._sum.amount || 0,
        monthlyPayroll: monthlyPayroll._sum.amount || 0,
        monthlyProfit,
        collectionRate,
        overdueInvoicesCount: overdueInvoices.length,
        overdueAmount,
        pendingApprovals,
        avgPerformanceScore: avgPerformance,
        busyEmployeesCount: busyEmployees.filter((e) => e.busy).length,
      },
      projects: projectsMapped,
      delayedTasks,
      busyEmployees,
      overdueClients: Object.values(overdueByClient).sort((a, b) => b.totalDue - a.totalDue),
      overdueInvoices: overdueInvoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        total: inv.total,
        status: inv.status,
        dueDate: inv.dueDate,
        client: inv.client,
      })),
      performance: {
        avgScore: avgPerformance,
        recentReports: performanceReports.map((r) => ({
          id: r.id,
          period: r.period,
          score: r.score,
          employee: `${r.employee.user.firstName} ${r.employee.user.lastName}`,
          department: r.employee.department,
        })),
        projectHealth: projectsMapped.slice(0, 8).map((p) => ({
          id: p.id,
          name: p.name,
          progress: p.progress,
          onTrack: !p.isDelayed && p.progress >= 50,
          isDelayed: p.isDelayed,
        })),
      },
      revenueByMonth,
      teamWorkload: teamWorkload.map((emp) => ({
        ...emp,
        activeTasks: taskCountMap[emp.user.id] || 0,
        busy: emp.workload >= 3 || (taskCountMap[emp.user.id] || 0) >= 4,
      })),
      recentActivities,
      charts: {
        tasksByStatus: taskStats,
        clientsByStatus: clientStats,
        projectsByStatus: projectStats,
      },
    };

    if (!includeFinance) {
      result.overview.monthlyRevenue = 0;
      result.overview.monthlyExpenses = 0;
      result.overview.monthlyPayroll = 0;
      result.overview.monthlyProfit = 0;
      result.overview.collectionRate = 0;
      result.overview.overdueInvoicesCount = 0;
      result.overview.overdueAmount = 0;
      result.overdueClients = [];
      result.overdueInvoices = [];
      result.revenueByMonth = [];
    }

    return result;
  }

  private async getRevenueByMonth(months: number) {
    const result: { month: string; revenue: number; expenses: number; profit: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const [rev, exp, payroll] = await Promise.all([
        this.prisma.payment.aggregate({
          where: { status: 'COMPLETED', paidAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.payroll.aggregate({
          where: { paidAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);
      const revenue = rev._sum.amount || 0;
      const expenses = (exp._sum.amount || 0) + (payroll._sum.amount || 0);
      result.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        revenue,
        expenses,
        profit: revenue - expenses,
      });
    }
    return result;
  }
}
