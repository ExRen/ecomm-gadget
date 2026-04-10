import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async getProductReviews(productId: string, page = 1, limit = 10, rating?: number) {
    const where: any = { productId, status: ReviewStatus.APPROVED };
    if (rating) where.rating = rating;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    const summary = await this.prisma.review.aggregate({
      where: { productId, status: ReviewStatus.APPROVED },
      _avg: { rating: true },
      _count: true,
    });

    const distribution = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId, status: ReviewStatus.APPROVED },
      _count: true,
    });

    return {
      reviews,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: {
        avg: summary._avg.rating || 0,
        count: summary._count,
        distribution,
      },
    };
  }

  async createReview(userId: string, productId: string, rating: number, comment?: string) {
    // Check if user has purchased and received the product
    const deliveredOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        status: 'DELIVERED',
        items: { some: { productId } },
      },
    });

    if (!deliveredOrder) {
      throw new BadRequestException('You can only review products you have purchased and received');
    }

    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) throw new BadRequestException('You have already reviewed this product');

    if (rating < 1 || rating > 5) throw new BadRequestException('Rating must be 1-5');

    const review = await this.prisma.review.create({
      data: { userId, productId, rating, comment },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return { review };
  }

  // Admin
  async findAllAdmin(page = 1, limit = 20, status?: string) {
    const where: any = {};
    if (status) where.status = status as ReviewStatus;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      reviews,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async approve(id: string) {
    const review = await this.prisma.review.update({
      where: { id },
      data: { status: ReviewStatus.APPROVED },
    });
    return { review };
  }

  async reject(id: string) {
    const review = await this.prisma.review.update({
      where: { id },
      data: { status: ReviewStatus.REJECTED },
    });
    return { review };
  }

  async deleteReview(id: string) {
    await this.prisma.review.delete({ where: { id } });
    return { message: 'Review deleted' };
  }
}
