import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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

  @RequirePermissions('hr.read', 'users.read')
  @Get('team')
  findTeam(@CurrentUser('role') role: string) {
    return this.usersService.findTeam(role);
  }

  @RequirePermissions('users.create', 'users.read', 'hr.manage')
  @Get('roles/options')
  listRoles(@CurrentUser('role') role: string) {
    return this.usersService.listAssignableRoles(role);
  }

  @RequirePermissions('users.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @RequirePermissions('users.create')
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser('role') role: string) {
    return this.usersService.create(dto, role);
  }

  @RequirePermissions('users.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.update(id, dto, role);
  }

  @RequirePermissions('users.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
