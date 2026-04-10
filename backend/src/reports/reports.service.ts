import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(dateFrom?: string, dateTo?: string) {
    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    const orderWhere: any = { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } };
    if (dateFrom || dateTo) orderWhere.createdAt = dateFilter;

    const [totalRevenue, totalOrders, totalProducts, totalCustomers] = await Promise.all([
      this.prisma.order.aggregate({
        where: orderWhere,
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
    ]);

    const revenue = Number(totalRevenue._sum.totalAmount || 0);
    const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    // Revenue by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await this.prisma.order.findMany({
      where: {
        ...orderWhere,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    const revenueByDay: Record<string, number> = {};
    orders.forEach((order) => {
      const day = order.createdAt.toISOString().split('T')[0];
      revenueByDay[day] = (revenueByDay[day] || 0) + Number(order.totalAmount);
    });

    // Top products
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    return {
      totalRevenue: revenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      avgOrderValue: Math.round(avgOrderValue),
      revenueByDay: Object.entries(revenueByDay).map(([date, value]) => ({
        date,
        revenue: value,
      })),
      topProducts,
    };
  }

  async getOrderReport(dateFrom?: string, dateTo?: string, groupBy = 'day') {
    const where: any = { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const orders = await this.prisma.order.findMany({
      where,
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped: Record<string, { orderCount: number; revenue: number }> = {};
    orders.forEach((order) => {
      let key: string;
      const d = order.createdAt;
      if (groupBy === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = d.toISOString().split('T')[0];
      }
      if (!grouped[key]) grouped[key] = { orderCount: 0, revenue: 0 };
      grouped[key].orderCount++;
      grouped[key].revenue += Number(order.totalAmount);
    });

    return {
      data: Object.entries(grouped).map(([date, data]) => ({ date, ...data })),
    };
  }

  async getProductReport() {
    const topSelling = await this.prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 20,
    });

    const lowStock = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0, lte: 10 } },
      select: { id: true, name: true, sku: true, stock: true },
      orderBy: { stock: 'asc' },
    });

    const outOfStock = await this.prisma.product.findMany({
      where: { isActive: true, stock: 0 },
      select: { id: true, name: true, sku: true, stock: true },
    });

    return { topSelling, lowStock, outOfStock };
  }
}
