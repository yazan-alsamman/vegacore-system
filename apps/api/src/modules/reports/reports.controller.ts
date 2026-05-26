import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SmartReportType } from '@prisma/client';
import { Response } from 'express';
import * as fs from 'fs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Smart Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @RequirePermissions('reports.read')
  @Get()
  workspace(@CurrentUser() user: { id: string; permissions: string[] }) {
    return {
      types: this.reportsService.listTypes(user.permissions),
      history: this.reportsService.listHistory(user.id, user.permissions),
    };
  }

  @RequirePermissions('reports.generate')
  @Post('generate')
  generate(
    @CurrentUser() user: { id: string; permissions: string[] },
    @Body() body: { type: SmartReportType },
  ) {
    return this.reportsService.generate(body.type, user.id, user.permissions);
  }

  @RequirePermissions('reports.read')
  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; permissions: string[] },
    @Res() res: Response,
  ) {
    const report = await this.reportsService.getDownload(id, user.id, user.permissions);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    fs.createReadStream(report.filePath).pipe(res);
  }
}
