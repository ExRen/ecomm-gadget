import {
  Controller, Get, Put, Body,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Roles, Public } from '../common/decorators';
import { Role } from '@prisma/client';

// Public endpoint to get shipping cost
@Controller('settings')
@Public()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('shipping')
  async getShippingCost() {
    const shippingCost = await this.settingsService.getShippingCost();
    return { shippingCost };
  }
}

// SEK-001: Admin settings — requires ADMIN/SUPER_ADMIN role (global guards active)
@Controller('admin/settings')
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
