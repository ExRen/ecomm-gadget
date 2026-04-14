import {
  Injectable, NotFoundException, BadRequestException, UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, OrderStatus, PaymentMethod } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private snap: any;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Dynamic import for midtrans-client
    this.initMidtrans();
  }

  private async initMidtrans() {
    try {
      const midtransClient = await import('midtrans-client');
      this.snap = new midtransClient.Snap({
        isProduction: this.configService.get('MIDTRANS_IS_PRODUCTION') === 'true',
        serverKey: this.configService.get('MIDTRANS_SERVER_KEY'),
        clientKey: this.configService.get('MIDTRANS_CLIENT_KEY'),
      });
    } catch (e) {
      this.logger.warn('Midtrans client not initialized: ' + e);
    }
  }

  async createSnapToken(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: true,
        address: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const itemDetails = order.items.map((item) => ({
      id: item.productId,
      price: Math.round(Number(item.price)),
      quantity: item.quantity,
      name: item.productName.substring(0, 50),
    }));

    if (Number(order.shippingCost) > 0) {
      itemDetails.push({
        id: 'shipping',
        price: Math.round(Number(order.shippingCost)),
        quantity: 1,
        name: 'Shipping Cost',
      });
    }

    if (Number(order.discountAmount) > 0) {
      itemDetails.push({
        id: 'discount',
        price: -Math.round(Number(order.discountAmount)),
        quantity: 1,
        name: 'Discount',
      });
    }

    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: Math.round(Number(order.totalAmount)),
      },
      customer_details: {
        first_name: order.user.name,
        email: order.user.email,
        phone: order.user.phone || '',
        billing_address: {
          address: order.address.street,
          city: order.address.city,
          postal_code: order.address.postalCode,
          country_code: 'IDN',
        },
      },
      item_details: itemDetails,
      callbacks: {
        finish: `${this.configService.get('FRONTEND_URL')}/checkout/success?order=${order.orderNumber}`,
        error: `${this.configService.get('FRONTEND_URL')}/checkout/failed?order=${order.orderNumber}`,
        pending: `${this.configService.get('FRONTEND_URL')}/account/orders/${order.orderNumber}`,
      },
      expiry: {
        unit: 'hours',
        duration: 24,
      },
    };

    if (!this.snap) {
      // Return mock for development without Midtrans
      const mockToken = `mock-snap-${order.id}`;
      await this.prisma.payment.update({
        where: { orderId: order.id },
        data: { snapToken: mockToken },
      });
      return { snapToken: mockToken, redirectUrl: '#' };
    }

    try {
      const transaction = await this.snap.createTransaction(parameter);
      await this.prisma.payment.update({
        where: { orderId: order.id },
        data: { snapToken: transaction.token },
      });
      return {
        snapToken: transaction.token,
        redirect_url: transaction.redirect_url,
      };
    } catch (error) {
      this.logger.error('Midtrans Create Transaction Error:', error);
      throw new BadRequestException('Failed to create payment: ' + error.message);
    }
  }

  /**
   * SEK-002: Webhook handler with idempotency protection against replay attacks.
   *
   * Defense layers:
   * 1. Signature verification (existing) — validates request came from Midtrans
   * 2. Idempotency check (NEW) — rejects processing for orders already in terminal state
   * 3. Atomic transaction — prevents race conditions from concurrent webhooks
   */
  async handleWebhook(payload: any) {
    // 1. Check if payload is empty or a test ping
    if (!payload || !payload.order_id || !payload.signature_key) {
      this.logger.log('Received Midtrans test ping or invalid payload');
      return { status: 'OK', message: 'Test ping received' };
    }

    // 2. Verify signature
    const serverKey = this.configService.get('MIDTRANS_SERVER_KEY');
    const hash = crypto
      .createHash('sha512')
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
      .digest('hex');

    if (hash !== payload.signature_key) {
      this.logger.warn(`SEK-002: Invalid signature for order ${payload.order_id}`);
      // Return 200 to avoid Midtrans retries, but don't process
      return { status: 'ERROR', message: 'Invalid signature' };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { midtransOrderId: payload.order_id },
    });

    if (!payment) {
      this.logger.warn(`SEK-002: Webhook for unknown order: ${payload.order_id}`);
      return { status: 'OK', message: 'Order not found — ignored' };
    }

    // 3. SEK-002 IDEMPOTENCY CHECK — prevent replay attack
    // If payment is already in a terminal state, reject duplicate processing
    const TERMINAL_STATUSES: PaymentStatus[] = [
      PaymentStatus.SUCCESS,
      PaymentStatus.FAILED,
      PaymentStatus.EXPIRED,
      PaymentStatus.REFUNDED,
    ];

    if (TERMINAL_STATUSES.includes(payment.paymentStatus)) {
      this.logger.log(
        `SEK-002: Duplicate webhook ignored for order ${payload.order_id}, ` +
        `current status: ${payment.paymentStatus}`,
      );
      return { status: 'OK', message: 'Already processed' };
    }

    const { transaction_status, fraud_status, payment_type } = payload;
    let newPaymentStatus: PaymentStatus;
    let newOrderStatus: OrderStatus;

    if (transaction_status === 'capture') {
      newPaymentStatus = fraud_status === 'accept' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
      newOrderStatus = fraud_status === 'accept' ? OrderStatus.PAID : OrderStatus.FAILED;
    } else if (transaction_status === 'settlement') {
      newPaymentStatus = PaymentStatus.SUCCESS;
      newOrderStatus = OrderStatus.PAID;
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      newPaymentStatus = transaction_status === 'expire' ? PaymentStatus.EXPIRED : PaymentStatus.FAILED;
      newOrderStatus = transaction_status === 'cancel' ? OrderStatus.CANCELLED : OrderStatus.FAILED;
    } else if (transaction_status === 'pending') {
      newPaymentStatus = PaymentStatus.PENDING;
      newOrderStatus = OrderStatus.PENDING_PAYMENT;
    } else if (transaction_status === 'refund') {
      newPaymentStatus = PaymentStatus.REFUNDED;
      newOrderStatus = OrderStatus.REFUNDED;
    } else {
      return { status: 'OK' };
    }

    // 4. Atomic transaction for status update
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: newPaymentStatus,
          paymentMethod: this.mapPaymentType(payment_type),
          midtransTransactionId: payload.transaction_id,
          rawResponse: payload,
          paidAt: newPaymentStatus === PaymentStatus.SUCCESS ? new Date() : undefined,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: newOrderStatus },
      });

      // Stock is decremented at order creation time.
      // If payment fails/expires/cancelled, restore stock.
      if (newPaymentStatus === PaymentStatus.FAILED || newPaymentStatus === PaymentStatus.EXPIRED) {
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: payment.orderId },
        });
        for (const item of orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    });

    this.logger.log(
      `Webhook processed: order ${payload.order_id} → ` +
      `payment=${newPaymentStatus}, order=${newOrderStatus}`,
    );
    return { status: 'OK' };
  }

  async getPaymentStatus(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { order: { select: { orderNumber: true, status: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return { payment };
  }

  async repay(orderNumber: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new UnauthorizedException('Access denied');
    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Order is not pending payment');
    }

    return this.createSnapToken(order.id);
  }

  private mapPaymentType(paymentType: string): PaymentMethod | null {
    const map: Record<string, PaymentMethod> = {
      credit_card: PaymentMethod.CREDIT_CARD,
      bank_transfer: PaymentMethod.BANK_TRANSFER,
      gopay: PaymentMethod.GOPAY,
      shopeepay: PaymentMethod.SHOPEEPAY,
      qris: PaymentMethod.QRIS,
      cstore: PaymentMethod.INDOMARET,
    };
    return map[paymentType] || null;
  }
}
