import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '@prisma/client';

@Controller('products/:productId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('rating') rating?: number,
  ) {
    return this.reviewsService.getProductReviews(
      productId, Number(page) || 1, Number(limit) || 10, rating ? Number(rating) : undefined,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.reviewsService.createReview(userId, productId, body.rating, body.comment);
  }
}

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.reviewsService.findAllAdmin(Number(page) || 1, Number(limit) || 20, status);
  }

  @Patch(':id/approve')
  async approve(@Param('id') id: string) {
    return this.reviewsService.approve(id);
  }

  @Patch(':id/reject')
  async reject(@Param('id') id: string) {
    return this.reviewsService.reject(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.reviewsService.deleteReview(id);
  }
}
