import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators';
import { Role } from '@prisma/client';

// SEK-001: Admin reports — requires ADMIN/SUPER_ADMIN role (global guards active)
@Controller('admin/reports')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async getSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.getSummary(dateFrom, dateTo);
  }

  @Get('orders')
  async getOrderReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.reportsService.getOrderReport(dateFrom, dateTo, groupBy);
  }

  @Get('products')
  async getProductReport() {
    return this.reportsService.getProductReport();
  }
}
