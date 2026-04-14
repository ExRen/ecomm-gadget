import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CurrentUser } from '../common/decorators';

// Authenticated customer endpoints (global JwtAuthGuard handles auth)
@Controller('wishlist')
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
