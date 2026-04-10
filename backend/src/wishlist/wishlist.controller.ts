import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async getWishlist(@CurrentUser('id') userId: string) {
    return this.wishlistService.getWishlist(userId);
  }

  @Get('ids')
  async getWishlistIds(@CurrentUser('id') userId: string) {
    return this.wishlistService.getWishlistIds(userId);
  }

  @Post(':productId')
  async add(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    return this.wishlistService.addToWishlist(userId, productId);
  }

  @Delete(':productId')
  async remove(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    return this.wishlistService.removeFromWishlist(userId, productId);
  }
}
