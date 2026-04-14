import {
  Controller, Post, Get, Body, Param, HttpCode,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CurrentUser, Public } from '../common/decorators';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Authenticated: customer creates snap token
  @Post('payments/create-snap-token')
  async createSnapToken(@Body() body: { orderId: string }) {
    return this.paymentsService.createSnapToken(body.orderId);
  }

  // SEK-002: Webhook — must be public (Midtrans server-to-server callback)
  // Skip throttle to not block Midtrans retries
  @Post('webhooks/midtrans')
  @Public()
  @SkipThrottle()
  @HttpCode(200)
  async handleWebhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }

  // Authenticated: check payment status
  @Get('payments/status/:orderId')
  async getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentStatus(orderId);
  }

  // Authenticated: retry payment for pending order
  @Post('payments/repay/:orderNumber')
  async repay(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.repay(orderNumber, userId);
  }
}
