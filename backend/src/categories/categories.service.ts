import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/categories.dto';
import slugify from 'slugify';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          include: { _count: { select: { products: { where: { isActive: true } } } } },
        },
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    return { categories };
  }

  async findAllAdmin() {
    const categories = await this.prisma.category.findMany({
      include: {
        children: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
    return { categories };
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: { where: { isActive: true } },
        products: {
          where: { isActive: true },
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            _count: { select: { reviews: true } },
          },
          take: 20,
        },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return { category };
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Category name already exists');

    const category = await this.prisma.category.create({
      data: { ...dto, slug },
    });
    return { category };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');

    const data: any = { ...dto };
    if (dto.name) {
      data.slug = slugify(dto.name, { lower: true, strict: true });
    }

    const category = await this.prisma.category.update({
      where: { id },
      data,
    });
    return { category };
  }

  async delete(id: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw new NotFoundException('Category not found');
    if (existing._count.products > 0) {
      throw new ConflictException('Cannot delete category with products');
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }
}
