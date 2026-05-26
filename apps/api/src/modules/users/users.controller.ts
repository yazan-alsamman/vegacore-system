import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @RequirePermissions('users.read')
  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query);
  }

  @RequirePermissions('users.create', 'users.read', 'hr.manage')
  @Get('roles/options')
  listRoles() {
    return this.usersService.listAssignableRoles();
  }

  @RequirePermissions('users.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @RequirePermissions('users.create')
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @RequirePermissions('users.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.usersService.update(id, body);
  }

  @RequirePermissions('users.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
