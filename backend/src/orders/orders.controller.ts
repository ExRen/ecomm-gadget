import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto, CancelOrderDto } from './dto/orders.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAllByUser(userId, Number(page) || 1, Number(limit) || 10, status);
  }

  @Get(':orderNumber')
  async findByOrderNumber(
    @CurrentUser('id') userId: string,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.ordersService.findByOrderNumber(userId, orderNumber);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(userId, dto);
  }

  @Post(':orderNumber/cancel')
  async cancel(
    @CurrentUser('id') userId: string,
    @Param('orderNumber') orderNumber: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(userId, orderNumber, dto.reason);
  }

  @Post(':orderNumber/confirm-payment')
  async confirmPayment(
    @CurrentUser('id') userId: string,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.ordersService.confirmPayment(userId, orderNumber);
  }

  @Post(':orderNumber/retry-payment')
  async retryPayment(
    @CurrentUser('id') userId: string,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.ordersService.retryPayment(userId, orderNumber);
  }
}

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.ordersService.findAllAdmin(
      Number(page) || 1, Number(limit) || 20, status, search, dateFrom, dateTo,
    );
  }

  @Get(':orderNumber')
  async findByOrderNumber(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByOrderNumberAdmin(orderNumber);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
