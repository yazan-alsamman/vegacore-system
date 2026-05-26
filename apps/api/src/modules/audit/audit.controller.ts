import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @RequirePermissions('audit.read')
  @Get()
  findAll(@Query() query: PaginationDto, @Query('entity') entity?: string) {
    return this.auditService.findAll(query, entity);
  }
}
