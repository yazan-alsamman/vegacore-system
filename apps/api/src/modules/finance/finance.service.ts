import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  private monthRange(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  async syncInvoicePaymentStatus(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: { where: { status: 'COMPLETED' } } },
    });
    if (!invoice) return;

    const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
    if (paid >= invoice.total) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: new Date() },
      });
    } else {
      const overdue = invoice.dueDate && invoice.dueDate < new Date();
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: overdue ? 'OVERDUE' : invoice.status === 'PAID' ? 'SENT' : invoice.status,
          paidAt: null,
        },
      });
    }
  }

  async getInvoices(query: PaginationDto, status?: InvoiceStatus, clientId?: string) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;
    const where: Prisma.InvoiceWhereInput = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, companyName: true } },
          payments: { where: { status: 'COMPLETED' } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async createInvoice(data: {
    clientId: string;
    amount: number;
    tax?: number;
    dueDate?: string;
    items?: unknown[];
    notes?: string;
    serviceType?: string;
    status?: InvoiceStatus;
  }) {
    const count = await this.prisma.invoice.count();
    const number = `INV-${String(count + 1).padStart(5, '0')}`;
    const tax = data.tax || 0;
    const total = data.amount + tax;
    return this.prisma.invoice.create({
      data: {
        number,
        clientId: data.clientId,
        amount: data.amount,
        tax,
        total,
        serviceType: data.serviceType,
        status: data.status || 'SENT',
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        items: data.items as Prisma.InputJsonValue,
        notes: data.notes,
      },
      include: { client: { select: { id: true, companyName: true } } },
    });
  }

  async recordPayment(data: {
    invoiceId?: string;
    amount: number;
    method?: string;
    reason?: string;
    reference?: string;
  }) {
    if (!data.reason?.trim()) {
      throw new BadRequestException('Payment reason is required');
    }
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method,
        reason: data.reason?.trim() || undefined,
        reference: data.reference,
        status: 'COMPLETED',
        paidAt: new Date(),
      },
      include: { invoice: { include: { client: { select: { companyName: true } } } } },
    });
    if (data.invoiceId) await this.syncInvoicePaymentStatus(data.invoiceId);
    return payment;
  }

  async removePayment(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.prisma.payment.delete({ where: { id } });
    if (payment.invoiceId) await this.syncInvoicePaymentStatus(payment.invoiceId);
    return { message: 'Payment deleted' };
  }

  getPayments(limit = 50) {
    return this.prisma.payment.findMany({
      take: limit,
      orderBy: { paidAt: 'desc' },
      include: {
        invoice: {
          select: {
            number: true,
            client: { select: { companyName: true } },
          },
        },
      },
    });
  }

  getExpenses() {
    return this.prisma.expense.findMany({ orderBy: { date: 'desc' } });
  }

  createExpense(data: {
    title: string;
    amount: number;
    category?: string;
    description?: string;
    isRecurring?: boolean;
    date?: string;
  }) {
    return this.prisma.expense.create({
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
  }

  updateExpense(id: string, data: Record<string, unknown>) {
    const patch: Prisma.ExpenseUpdateInput = {};
    if (data.title !== undefined) patch.title = data.title as string;
    if (data.amount !== undefined) patch.amount = Number(data.amount);
    if (data.category !== undefined) patch.category = data.category as string;
    if (data.description !== undefined) patch.description = data.description as string;
    if (data.isRecurring !== undefined) patch.isRecurring = Boolean(data.isRecurring);
    if (data.date !== undefined) patch.date = new Date(data.date as string);
    return this.prisma.expense.update({ where: { id }, data: patch });
  }

  async updateInvoice(id: string, data: Record<string, unknown>) {
    const patch: Prisma.InvoiceUpdateInput = {};
    if (data.clientId !== undefined) patch.client = { connect: { id: data.clientId as string } };
    if (data.amount !== undefined) patch.amount = Number(data.amount);
    if (data.tax !== undefined) patch.tax = Number(data.tax);
    if (data.status !== undefined) patch.status = data.status as InvoiceStatus;
    if (data.dueDate !== undefined) patch.dueDate = data.dueDate ? new Date(data.dueDate as string) : null;
    if (data.notes !== undefined) patch.notes = data.notes as string;
    if (data.serviceType !== undefined) patch.serviceType = data.serviceType as string;
    if (data.amount !== undefined || data.tax !== undefined) {
      const current = await this.prisma.invoice.findUnique({ where: { id } });
      if (current) {
        const amount = data.amount !== undefined ? Number(data.amount) : current.amount;
        const tax = data.tax !== undefined ? Number(data.tax) : current.tax;
        patch.total = amount + tax;
      }
    }
    return this.prisma.invoice.update({
      where: { id },
      data: patch,
      include: { client: { select: { id: true, companyName: true } }, payments: true },
    });
  }

  async removeInvoice(id: string) {
    await this.prisma.payment.deleteMany({ where: { invoiceId: id } });
    await this.prisma.invoice.delete({ where: { id } });
    return { message: 'Invoice deleted' };
  }

  async removeExpense(id: string) {
    await this.prisma.expense.delete({ where: { id } });
    return { message: 'Expense deleted' };
  }

  getSubscriptions() {
    return this.prisma.subscription.findMany({
      orderBy: { nextDue: 'asc' },
      include: { client: { select: { id: true, companyName: true } } },
    });
  }

  createSubscription(data: {
    clientId: string;
    name: string;
    amount: number;
    interval: string;
    nextDue?: string;
    isActive?: boolean;
  }) {
    return this.prisma.subscription.create({
      data: {
        ...data,
        nextDue: data.nextDue ? new Date(data.nextDue) : undefined,
        isActive: data.isActive ?? true,
      },
      include: { client: { select: { id: true, companyName: true } } },
    });
  }

  async updateSubscription(id: string, data: Record<string, unknown>) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
    return this.prisma.subscription.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name as string } : {}),
        ...(data.amount !== undefined ? { amount: Number(data.amount) } : {}),
        ...(data.interval !== undefined ? { interval: data.interval as string } : {}),
        ...(data.nextDue !== undefined ? { nextDue: data.nextDue ? new Date(data.nextDue as string) : null } : {}),
        ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
      },
      include: { client: { select: { id: true, companyName: true } } },
    });
  }

  async removeSubscription(id: string) {
    await this.prisma.subscription.delete({ where: { id } });
    return { message: 'Subscription deleted' };
  }

  getPayroll() {
    return this.prisma.payroll.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
  }

  createPayroll(data: { employeeId: string; amount: number; period: string; paidAt?: string; notes?: string }) {
    return this.prisma.payroll.create({
      data: {
        employeeId: data.employeeId,
        amount: data.amount,
        period: data.period,
        paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
        notes: data.notes,
      },
      include: {
        employee: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async updatePayroll(id: string, data: Record<string, unknown>) {
    return this.prisma.payroll.update({
      where: { id },
      data: {
        ...(data.amount !== undefined ? { amount: Number(data.amount) } : {}),
        ...(data.period !== undefined ? { period: data.period as string } : {}),
        ...(data.paidAt !== undefined ? { paidAt: data.paidAt ? new Date(data.paidAt as string) : null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes as string } : {}),
      },
      include: {
        employee: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async removePayroll(id: string) {
    await this.prisma.payroll.delete({ where: { id } });
    return { message: 'Payroll deleted' };
  }

  async getDashboard() {
    const now = new Date();
    const { start: startOfMonth, end: endOfMonth } = this.monthRange(now);

    const [
      monthlyRevenue,
      monthlyExpenses,
      monthlyPayroll,
      allInvoiced,
      allPaidInvoices,
      unpaidInvoices,
      recentPayments,
      topClientsRaw,
      topServicesRaw,
      revenueByMonth,
      activeSubscriptions,
      recurringExpenses,
    ] = await Promise.all([
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
      this.prisma.invoice.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.invoice.findMany({
        where: { status: { in: ['SENT', 'OVERDUE'] } },
        include: { client: { select: { id: true, companyName: true } } },
        orderBy: { dueDate: 'asc' },
        take: 15,
      }),
      this.prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { paidAt: 'desc' },
        take: 8,
        include: {
          invoice: {
            select: {
              number: true,
              client: { select: { companyName: true } },
            },
          },
        },
      }),
      this.prisma.invoice.groupBy({
        by: ['clientId'],
        where: { status: 'PAID' },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      this.prisma.invoice.groupBy({
        by: ['serviceType'],
        where: { status: 'PAID', serviceType: { not: null } },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      this.getRevenueByMonth(6),
      this.prisma.subscription.findMany({
        where: { isActive: true },
        include: { client: { select: { id: true, companyName: true } } },
        orderBy: { nextDue: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: { isRecurring: true },
        orderBy: { title: 'asc' },
      }),
    ]);

    const clientIds = topClientsRaw.map((c) => c.clientId);
    const clients = clientIds.length
      ? await this.prisma.client.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, companyName: true },
        })
      : [];
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.companyName]));

    const topClients = topClientsRaw.map((c) => ({
      clientId: c.clientId,
      companyName: clientMap[c.clientId] || '—',
      revenue: c._sum.total || 0,
    }));

    const topServices = topServicesRaw.map((s) => ({
      serviceType: s.serviceType || 'Other',
      revenue: s._sum.total || 0,
    }));

    const totalInvoiced = allInvoiced._sum.total || 0;
    const totalCollected = allPaidInvoices._sum.total || 0;
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    const revenue = monthlyRevenue._sum.amount || 0;
    const expenses = (monthlyExpenses._sum.amount || 0) + (monthlyPayroll._sum.amount || 0);
    const monthlyProfit = revenue - expenses;

    const recurringMonthly = activeSubscriptions.reduce((s, sub) => {
      const mult = sub.interval === 'yearly' ? 1 / 12 : sub.interval === 'quarterly' ? 1 / 3 : 1;
      return s + sub.amount * mult;
    }, 0);

    return {
      monthlyRevenue: revenue,
      monthlyExpenses: monthlyExpenses._sum.amount || 0,
      monthlyPayroll: monthlyPayroll._sum.amount || 0,
      monthlyProfit,
      collectionRate,
      totalInvoiced,
      totalCollected,
      unpaidInvoices,
      recentPayments,
      topClients,
      topService: topServices[0] || null,
      topServices,
      topClient: topClients[0] || null,
      revenueByMonth,
      activeSubscriptions,
      recurringExpenses,
      recurringMonthly,
      subscriptionCount: activeSubscriptions.length,
    };
  }

  private async getRevenueByMonth(months: number) {
    const result: { month: string; revenue: number; expenses: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const { start, end } = this.monthRange(d);
      const [rev, exp] = await Promise.all([
        this.prisma.payment.aggregate({
          where: { status: 'COMPLETED', paidAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);
      result.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        revenue: rev._sum.amount || 0,
        expenses: exp._sum.amount || 0,
      });
    }
    return result;
  }

  async getWorkspace() {
    const [dashboard, invoices, expenses, subscriptions, payroll, payments, clients, employees] =
      await Promise.all([
        this.getDashboard(),
        this.getInvoices({ page: 1, limit: 100 } as PaginationDto),
        this.getExpenses(),
        this.getSubscriptions(),
        this.getPayroll(),
        this.getPayments(30),
        this.prisma.client.findMany({
          select: { id: true, companyName: true },
          orderBy: { companyName: 'asc' },
        }),
        this.prisma.employeeProfile.findMany({
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        }),
      ]);

    return {
      dashboard,
      invoices: invoices.data,
      expenses,
      subscriptions,
      payroll,
      payments,
      clients,
      employees: employees.map((e) => ({
        id: e.id,
        name: `${e.user.firstName} ${e.user.lastName}`,
        department: e.department,
        email: e.user.email,
      })),
    };
  }
}
