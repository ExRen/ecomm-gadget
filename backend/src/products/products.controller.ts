import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/products.dto';
import { Roles, Public } from '../common/decorators';
import { Role } from '@prisma/client';

// Public product endpoints — no auth required
@Controller('products')
@Public()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('featured')
  async findFeatured() {
    return this.productsService.findFeatured();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id/related')
  async findRelated(@Param('id') id: string) {
    return this.productsService.findRelated(id);
  }
}

// SEK-001: Admin product endpoints — requires ADMIN/SUPER_ADMIN role
@Controller('admin/products')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.productsService.findAllAdmin(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      search, category, status,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 5))
  async create(
    @Body() dto: CreateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const imageUrls = files?.map((file, idx) => ({
      url: `/uploads/products/${file.filename}`,
      publicId: `product_${Date.now()}_${idx}`,
    }));
    return this.productsService.create(dto, imageUrls);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 5))
  async update(
    @Param('id') id: string, 
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    let imageUrls = undefined;
    if (files && files.length > 0) {
      imageUrls = files.map((file, idx) => ({
        url: `/uploads/products/${file.filename}`,
        publicId: `product_${Date.now()}_${idx}`,
      }));
    }
    return this.productsService.update(id, dto, imageUrls);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }

  @Patch(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return this.productsService.toggleActive(id);
  }
}
