import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getWishlist(userId: string) {
    const wishlist = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { wishlist };
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) return { message: 'Already in wishlist' };

    await this.prisma.wishlist.create({ data: { userId, productId } });
    return { message: 'Added to wishlist' };
  }

  async removeFromWishlist(userId: string, productId: string) {
    await this.prisma.wishlist.deleteMany({ where: { userId, productId } });
    return { message: 'Removed from wishlist' };
  }

  async getWishlistIds(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });
    return { productIds: items.map((i) => i.productId) };
  }
}
