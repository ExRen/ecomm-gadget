import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/products.dto';
import slugify from 'slugify';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.category) {
      const cat = await this.prisma.category.findUnique({
        where: { slug: query.category },
      });
      if (cat) where.categoryId = cat.id;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }

    if (query.inStock === 'true') {
      where.stock = { gt: 0 };
    }

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { sku: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.tags) {
      const tagSlugs = query.tags.split(',');
      where.tags = {
        some: { tag: { slug: { in: tagSlugs } } },
      };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (query.sortBy) {
      case 'price_asc': orderBy = { price: 'asc' }; break;
      case 'price_desc': orderBy = { price: 'desc' }; break;
      case 'newest': orderBy = { createdAt: 'desc' }; break;
      case 'popular': orderBy = { orderItems: { _count: 'desc' } }; break;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { reviews: true, orderItems: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Calculate avg rating for each product
    const productsWithRating = await Promise.all(
      products.map(async (p) => {
        const avgRating = await this.prisma.review.aggregate({
          where: { productId: p.id, status: 'APPROVED' },
          _avg: { rating: true },
        });
        return { ...p, avgRating: avgRating._avg.rating || 0 };
      }),
    );

    return {
      products: productsWithRating,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findFeatured() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 12,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const productsWithRating = await Promise.all(
      products.map(async (p) => {
        const avg = await this.prisma.review.aggregate({
          where: { productId: p.id, status: 'APPROVED' },
          _avg: { rating: true },
        });
        return { ...p, avgRating: avg._avg.rating || 0 };
      }),
    );

    return { products: productsWithRating };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { order: 'asc' } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: true } },
        reviews: {
          where: { status: 'APPROVED' },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { reviews: { where: { status: 'APPROVED' } } } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    const reviewStats = await this.prisma.review.aggregate({
      where: { productId: product.id, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });

    const ratingDistribution = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId: product.id, status: 'APPROVED' },
      _count: true,
    });

    return {
      product: {
        ...product,
        reviews: {
          avg: reviewStats._avg.rating || 0,
          count: reviewStats._count,
          distribution: ratingDistribution,
          items: product.reviews,
        },
      },
    };
  }

  async findRelated(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { categoryId: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const products = await this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: id },
        isActive: true,
      },
      take: 8,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        _count: { select: { reviews: true } },
      },
    });
    return { products };
  }

  // Admin methods
  async create(dto: CreateProductDto, imageUrls?: { url: string; publicId: string }[]) {
    let slug = slugify(dto.name, { lower: true, strict: true });
    const existing = await this.prisma.product.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const existingSku = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (existingSku) throw new ConflictException('SKU already exists');

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        comparePrice: dto.comparePrice,
        sku: dto.sku,
        stock: dto.stock,
        weight: dto.weight,
        categoryId: dto.categoryId,
        isFeatured: dto.isFeatured || false,
        images: imageUrls ? {
          create: imageUrls.map((img, idx) => ({
            url: img.url,
            publicId: img.publicId,
            isPrimary: idx === 0,
            order: idx,
          })),
        } : undefined,
        tags: dto.tags ? {
          create: await Promise.all(
            dto.tags.map(async (tagName) => {
              let tag = await this.prisma.tag.findUnique({
                where: { name: tagName },
              });
              if (!tag) {
                tag = await this.prisma.tag.create({
                  data: {
                    name: tagName,
                    slug: slugify(tagName, { lower: true, strict: true }),
                  },
                });
              }
              return { tagId: tag.id };
            }),
          ),
        } : undefined,
      },
      include: {
        images: true,
        category: true,
        tags: { include: { tag: true } },
      },
    });

    return { product };
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    const data: any = { ...dto };
    delete data.tags;

    if (dto.name) {
      let slug = slugify(dto.name, { lower: true, strict: true });
      const existSlug = await this.prisma.product.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existSlug) slug = `${slug}-${Date.now()}`;
      data.slug = slug;
    }

    if (dto.tags) {
      await this.prisma.productTag.deleteMany({ where: { productId: id } });
      for (const tagName of dto.tags) {
        let tag = await this.prisma.tag.findUnique({ where: { name: tagName } });
        if (!tag) {
          tag = await this.prisma.tag.create({
            data: { name: tagName, slug: slugify(tagName, { lower: true, strict: true }) },
          });
        }
        await this.prisma.productTag.create({
          data: { productId: id, tagId: tag.id },
        });
      }
    }

    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: {
        images: true,
        category: true,
        tags: { include: { tag: true } },
      },
    });

    return { product };
  }

  async delete(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }

  async toggleActive(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    const product = await this.prisma.product.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    return { product };
  }

  async findAllAdmin(page = 1, limit = 20, search?: string, category?: string, status?: string) {
    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.categoryId = category;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
