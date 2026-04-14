import {
  Controller, Get, Patch, Post, Delete, Body, Param, Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, Roles } from '../common/decorators';
import { UpdateProfileDto, CreateAddressDto, UpdateAddressDto } from './dto/users.dto';
import { ChangePasswordDto } from '../auth/dto';
import { Role } from '@prisma/client';

// Authenticated customer endpoints (global JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('me/change-password')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @Get('me/addresses')
  async getAddresses(@CurrentUser('id') userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Post('me/addresses')
  async createAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(userId, dto);
  }

  @Patch('me/addresses/:id')
  async updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(userId, addressId, dto);
  }

  @Delete('me/addresses/:id')
  async deleteAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.usersService.deleteAddress(userId, addressId);
  }

  @Patch('me/addresses/:id/default')
  async setDefaultAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.usersService.setDefaultAddress(userId, addressId);
  }
}

// SEK-001: Admin customer endpoints — requires ADMIN/SUPER_ADMIN role
@Controller('admin/customers')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminCustomersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllCustomers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.getAllCustomers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      search,
    );
  }
}
