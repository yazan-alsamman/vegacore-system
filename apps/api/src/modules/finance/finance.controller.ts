import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FinanceService } from './finance.service';

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @RequirePermissions('finance.read')
  @Get('workspace')
  getWorkspace() {
    return this.financeService.getWorkspace();
  }

  @RequirePermissions('finance.read')
  @Get('dashboard')
  getDashboard() {
    return this.financeService.getDashboard();
  }

  @RequirePermissions('finance.read')
  @Get('invoices')
  getInvoices(
    @Query() query: PaginationDto,
    @Query('status') status?: InvoiceStatus,
    @Query('clientId') clientId?: string,
  ) {
    return this.financeService.getInvoices(query, status, clientId);
  }

  @RequirePermissions('finance.create')
  @Post('invoices')
  createInvoice(@Body() body: Record<string, unknown>) {
    return this.financeService.createInvoice(body as Parameters<FinanceService['createInvoice']>[0]);
  }

  @RequirePermissions('finance.update')
  @Patch('invoices/:id')
  updateInvoice(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.financeService.updateInvoice(id, body);
  }

  @RequirePermissions('finance.delete')
  @Delete('invoices/:id')
  removeInvoice(@Param('id') id: string) {
    return this.financeService.removeInvoice(id);
  }

  @RequirePermissions('finance.read')
  @Get('payments')
  getPayments() {
    return this.financeService.getPayments();
  }

  @RequirePermissions('finance.create')
  @Post('payments')
  recordPayment(@Body() body: Record<string, unknown>) {
    return this.financeService.recordPayment(body as Parameters<FinanceService['recordPayment']>[0]);
  }

  @RequirePermissions('finance.delete')
  @Delete('payments/:id')
  removePayment(@Param('id') id: string) {
    return this.financeService.removePayment(id);
  }

  @RequirePermissions('finance.read')
  @Get('expenses')
  getExpenses() {
    return this.financeService.getExpenses();
  }

  @RequirePermissions('finance.create')
  @Post('expenses')
  createExpense(@Body() body: Record<string, unknown>) {
    return this.financeService.createExpense(body as Parameters<FinanceService['createExpense']>[0]);
  }

  @RequirePermissions('finance.update')
  @Patch('expenses/:id')
  updateExpense(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.financeService.updateExpense(id, body);
  }

  @RequirePermissions('finance.delete')
  @Delete('expenses/:id')
  removeExpense(@Param('id') id: string) {
    return this.financeService.removeExpense(id);
  }

  @RequirePermissions('finance.read')
  @Get('subscriptions')
  getSubscriptions() {
    return this.financeService.getSubscriptions();
  }

  @RequirePermissions('finance.create')
  @Post('subscriptions')
  createSubscription(@Body() body: Record<string, unknown>) {
    return this.financeService.createSubscription(body as Parameters<FinanceService['createSubscription']>[0]);
  }

  @RequirePermissions('finance.update')
  @Patch('subscriptions/:id')
  updateSubscription(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.financeService.updateSubscription(id, body);
  }

  @RequirePermissions('finance.delete')
  @Delete('subscriptions/:id')
  removeSubscription(@Param('id') id: string) {
    return this.financeService.removeSubscription(id);
  }

  @RequirePermissions('finance.read')
  @Get('payroll')
  getPayroll() {
    return this.financeService.getPayroll();
  }

  @RequirePermissions('finance.create')
  @Post('payroll')
  createPayroll(@Body() body: Record<string, unknown>) {
    return this.financeService.createPayroll(body as Parameters<FinanceService['createPayroll']>[0]);
  }

  @RequirePermissions('finance.update')
  @Patch('payroll/:id')
  updatePayroll(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.financeService.updatePayroll(id, body);
  }

  @RequirePermissions('finance.delete')
  @Delete('payroll/:id')
  removePayroll(@Param('id') id: string) {
    return this.financeService.removePayroll(id);
  }
}
