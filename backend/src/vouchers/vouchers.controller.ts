import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';
import { Role } from '@prisma/client';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  async validate(@Body() body: { code: string; totalAmount: number }) {
    return this.vouchersService.validate(body.code, body.totalAmount);
  }
}

@Controller('admin/vouchers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.vouchersService.findAll(Number(page) || 1, Number(limit) || 20);
  }

  @Post()
  async create(@Body() body: any) {
    return this.vouchersService.create(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.vouchersService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.vouchersService.delete(id);
  }
}
