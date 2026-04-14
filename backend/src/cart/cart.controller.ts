import {
  Controller, Get, Post, Patch, Delete, Body, Param,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CurrentUser } from '../common/decorators';

// Authenticated customer endpoints (global JwtAuthGuard handles auth)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  async addItem(
    @CurrentUser('id') userId: string,
    @Body() body: { productId: string; quantity: number },
  ) {
    return this.cartService.addItem(userId, body.productId, body.quantity);
  }

  @Patch('items/:productId')
  async updateQuantity(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateQuantity(userId, productId, body.quantity);
  }

  @Delete('items/:productId')
  async removeItem(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(userId, productId);
  }

  @Delete()
  async clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
