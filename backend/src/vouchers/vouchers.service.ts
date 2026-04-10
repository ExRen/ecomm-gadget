import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VoucherType } from '@prisma/client';

@Injectable()
export class VouchersService {
  constructor(private prisma: PrismaService) {}

  async validate(code: string, totalAmount: number) {
    const voucher = await this.prisma.voucher.findUnique({ where: { code } });

    if (!voucher) throw new NotFoundException('Voucher not found');
    if (!voucher.isActive) throw new BadRequestException('Voucher is inactive');
    if (new Date() < voucher.startDate) throw new BadRequestException('Voucher not yet active');
    if (new Date() > voucher.endDate) throw new BadRequestException('Voucher has expired');
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
      throw new BadRequestException('Voucher usage limit reached');
    }
    if (totalAmount < Number(voucher.minPurchase)) {
      throw new BadRequestException(`Minimum purchase is Rp ${Number(voucher.minPurchase).toLocaleString()}`);
    }

    let discountAmount = 0;
    if (voucher.type === VoucherType.PERCENTAGE) {
      discountAmount = totalAmount * (Number(voucher.value) / 100);
      if (voucher.maxDiscount && discountAmount > Number(voucher.maxDiscount)) {
        discountAmount = Number(voucher.maxDiscount);
      }
    } else {
      discountAmount = Number(voucher.value);
    }

    return {
      voucher: {
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        discountAmount: Math.round(discountAmount),
        description: voucher.description,
      },
    };
  }

  // Admin
  async findAll(page = 1, limit = 20) {
    const [vouchers, total] = await Promise.all([
      this.prisma.voucher.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.voucher.count(),
    ]);
    return {
      vouchers,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(data: {
    code: string;
    description: string;
    type: VoucherType;
    value: number;
    minPurchase?: number;
    maxDiscount?: number;
    usageLimit?: number;
    startDate: string;
    endDate: string;
  }) {
    const existing = await this.prisma.voucher.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestException('Voucher code already exists');

    const voucher = await this.prisma.voucher.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
    return { voucher };
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.voucher.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Voucher not found');

    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const voucher = await this.prisma.voucher.update({ where: { id }, data });
    return { voucher };
  }

  async delete(id: string) {
    await this.prisma.voucher.delete({ where: { id } });
    return { message: 'Voucher deleted' };
  }
}
