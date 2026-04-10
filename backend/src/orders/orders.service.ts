import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/orders.dto';
import { OrderStatus, Prisma } from '../generated/prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private settingsService: SettingsService,
  ) {}

  private async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `ORD-${dateStr}-`;

    // Find the last order number for today
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        orderNumber: { startsWith: prefix },
      },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });

    let nextNum = 1;
    if (lastOrder) {
      const lastNum = parseInt(lastOrder.orderNumber.replace(prefix, ''), 10);
      nextNum = lastNum + 1;
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  async create(userId: string, dto: CreateOrderDto) {
    // Get items from cart or from dto
    let items: { productId: string; quantity: number }[] = [];

    if (dto.fromCart) {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: true },
      });
      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }
      items = cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    } else if (dto.items && dto.items.length > 0) {
      items = dto.items;
    } else {
      throw new BadRequestException('No items provided');
    }

    // Validate address
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    // Validate stock and get product details
    const orderItems: any[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: { images: { where: { isPrimary: true }, take: 1 } },
      });

      if (!product || !product.isActive) {
        throw new BadRequestException(`Product ${item.productId} not found or inactive`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }

      const itemSubtotal = Number(product.price) * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        price: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        imageUrl: product.images[0]?.url || null,
      });
    }

    // Apply voucher
    let discountAmount = 0;
    let voucherId: string | undefined;

    if (dto.voucherCode) {
      const voucher = await this.prisma.voucher.findUnique({
        where: { code: dto.voucherCode },
      });

      if (voucher && voucher.isActive && new Date() >= voucher.startDate && new Date() <= voucher.endDate) {
        if (Number(voucher.minPurchase) <= subtotal) {
          if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
            throw new BadRequestException('Voucher usage limit reached');
          }

          if (voucher.type === 'PERCENTAGE') {
            discountAmount = subtotal * (Number(voucher.value) / 100);
            if (voucher.maxDiscount && discountAmount > Number(voucher.maxDiscount)) {
              discountAmount = Number(voucher.maxDiscount);
            }
          } else {
            discountAmount = Number(voucher.value);
          }
          voucherId = voucher.id;
        }
      }
    }

    const configuredShippingCost = await this.settingsService.getShippingCost();
    const shippingCost = dto.shippingMethod ? configuredShippingCost : 0;
    const totalAmount = subtotal - discountAmount + shippingCost;
    const orderNumber = await this.generateOrderNumber();

    // Create order in transaction
    let order: any;
    try {
      order = await this.prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            addressId: dto.addressId,
            subtotal,
            shippingCost,
            discountAmount,
            totalAmount,
            notes: dto.notes,
            voucherId,
            shippingMethod: dto.shippingMethod || 'STANDARD',
            items: { create: orderItems },
          },
          include: { items: true },
        });

        // Create payment record
        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            midtransOrderId: newOrder.id,
            grossAmount: totalAmount,
          },
        });

        // Decrement stock immediately (reserve stock at order creation)
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        // Clear cart
        if (dto.fromCart) {
          await tx.cartItem.deleteMany({
            where: { cart: { userId } },
          });
        }

        // Increment voucher usage
        if (voucherId) {
          await tx.voucher.update({
            where: { id: voucherId },
            data: { usedCount: { increment: 1 } },
          });
        }

        return newOrder;
      });
    } catch (txError) {
      console.error('🔴 Order transaction failed:', txError);
      throw new BadRequestException(
        `Order creation failed: ${txError.message || 'Database error'}`,
      );
    }

    // Generate Snap Token
    try {
      const paymentData = await this.paymentsService.createSnapToken(order.id);
      return {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          status: order.status,
        },
        snapToken: paymentData.snapToken,
        snapRedirectUrl: paymentData.redirectUrl,
      };
    } catch (e) {
      // If payment token generation fails, we still return the order
      // but with null token so the user can try again from order history
      console.error('Failed to generate Snap token:', e.message);
      return {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          status: order.status,
        },
        snapToken: null,
        snapRedirectUrl: null,
        paymentError: e.message,
      };
    }
  }

  async findAllByUser(userId: string, page = 1, limit = 10, status?: string) {
    const where: Prisma.OrderWhereInput = { userId };
    if (status) where.status = status as OrderStatus;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          items: true,
          payment: { select: { paymentStatus: true, paymentMethod: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByOrderNumber(userId: string, orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: { product: { select: { slug: true } } },
        },
        payment: true,
        address: true,
        voucher: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');

    return { order };
  }

  async cancelOrder(userId: string, orderNumber: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', cancelReason: reason },
      });
    });

    return { order: updated };
  }

  async confirmPayment(userId: string, orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (order.status !== 'PENDING_PAYMENT') {
      return { order }; // Already confirmed
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          paymentStatus: 'SUCCESS',
          paidAt: new Date(),
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });
    });

    return { order: updated };
  }

  async retryPayment(userId: string, orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Pesanan tidak menunggu pembayaran');
    }

    // If existing snapToken, return it
    if (order.payment?.snapToken) {
      return {
        snapToken: order.payment.snapToken,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
        },
      };
    }

    // Generate new snap token
    try {
      const paymentData = await this.paymentsService.createSnapToken(order.id);
      return {
        snapToken: paymentData.snapToken,
        snapRedirectUrl: paymentData.redirectUrl,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
        },
      };
    } catch (e) {
      throw new BadRequestException(`Gagal membuat token pembayaran: ${e.message}`);
    }
  }

  // Admin methods
  async findAllAdmin(page = 1, limit = 20, status?: string, search?: string, dateFrom?: string, dateTo?: string) {
    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status as OrderStatus;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          payment: { select: { paymentStatus: true, paymentMethod: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByOrderNumberAdmin(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payment: true,
        address: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        voucher: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return { order };
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const data: any = { status: dto.status };
    if (dto.trackingNumber) data.trackingNumber = dto.trackingNumber;

    const updated = await this.prisma.order.update({
      where: { id },
      data,
      include: { items: true, payment: true },
    });

    return { order: updated };
  }
}
