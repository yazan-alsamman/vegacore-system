import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ModelsService } from './models.service';

@ApiTags('Models')
@ApiBearerAuth()
@Controller('models')
export class ModelsController {
  constructor(private modelsService: ModelsService) {}

  @RequirePermissions('models.read')
  @Get()
  findAll() {
    return this.modelsService.findAll();
  }

  @RequirePermissions('models.read')
  @Get('eligible-users')
  getEligibleUsers() {
    return this.modelsService.getEligibleUsers();
  }

  @RequirePermissions('models.create')
  @Post()
  create(@Body() body: Record<string, unknown>) {
    if (body.mode === 'new-user') {
      return this.modelsService.createWithUser(body as Parameters<ModelsService['createWithUser']>[0]);
    }
    return this.modelsService.create(body as Parameters<ModelsService['create']>[0]);
  }

  @RequirePermissions('models.read')
  @Get(':id/profile')
  getProfile(@Param('id') id: string) {
    return this.modelsService.getProfile(id);
  }

  @RequirePermissions('models.read')
  @Get(':id/availability')
  getAvailability(@Param('id') id: string, @Query('from') from: string, @Query('to') to: string) {
    return this.modelsService.getAvailability(id, from, to);
  }

  @RequirePermissions('models.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.modelsService.findOne(id);
  }

  @RequirePermissions('models.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.modelsService.update(id, body);
  }

  @RequirePermissions('models.update')
  @Post(':id/bookings')
  createBooking(
    @Param('id') id: string,
    @Body() body: { shootId?: string; startTime: string; endTime: string; notes?: string; status?: string },
  ) {
    return this.modelsService.createBooking(id, body);
  }

  @RequirePermissions('models.update')
  @Patch(':id/bookings/:bookingId')
  updateBooking(@Param('id') id: string, @Param('bookingId') bookingId: string, @Body() body: Record<string, unknown>) {
    return this.modelsService.updateBooking(id, bookingId, body);
  }

  @RequirePermissions('models.update')
  @Delete(':id/bookings/:bookingId')
  removeBooking(@Param('id') id: string, @Param('bookingId') bookingId: string) {
    return this.modelsService.removeBooking(id, bookingId);
  }

  @RequirePermissions('models.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.modelsService.remove(id);
  }
}
