import {
  Controller, Get, Put, Body, UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';
import { Role } from '@prisma/client';

// Public endpoint to get shipping cost
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('shipping')
  async getShippingCost() {
    const shippingCost = await this.settingsService.getShippingCost();
    return { shippingCost };
  }
}

// Admin endpoint to manage settings
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async findAll() {
    return this.settingsService.findAll();
  }

  @Put()
  async updateSettings(@Body() body: { settings: { key: string; value: string; label?: string }[] }) {
    return this.settingsService.upsertMultiple(body.settings);
  }
}
