import {
  Controller, Post, Get, Body, Param, UseGuards, HttpCode,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payments/create-snap-token')
  @UseGuards(JwtAuthGuard)
  async createSnapToken(@Body() body: { orderId: string }) {
    return this.paymentsService.createSnapToken(body.orderId);
  }

  @Post('webhooks/midtrans')
  @HttpCode(200)
  async handleWebhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }

  @Get('payments/status/:orderId')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentStatus(orderId);
  }

  @Post('payments/repay/:orderNumber')
  @UseGuards(JwtAuthGuard)
  async repay(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.repay(orderNumber, userId);
  }
}
