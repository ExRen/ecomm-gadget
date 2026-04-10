import {
  Injectable, NotFoundException, BadRequestException, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, OrderStatus, PaymentMethod } from '../generated/prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private snap: any;

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
      console.warn('Midtrans client not initialized:', e);
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
        redirectUrl: transaction.redirect_url,
      };
    } catch (error) {
      throw new BadRequestException('Failed to create payment: ' + error.message);
    }
  }

  async handleWebhook(payload: any) {
    // Verify signature
    const serverKey = this.configService.get('MIDTRANS_SERVER_KEY');
    const hash = crypto
      .createHash('sha512')
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
      .digest('hex');

    if (hash !== payload.signature_key) {
      throw new UnauthorizedException('Invalid signature');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { midtransOrderId: payload.order_id },
    });
    if (!payment) throw new NotFoundException('Payment not found');

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
