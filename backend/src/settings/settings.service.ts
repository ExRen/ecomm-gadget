import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const settings = await this.prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
    return { settings };
  }

  async findByKey(key: string): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  async getShippingCost(): Promise<number> {
    const value = await this.findByKey('shipping_cost');
    return value ? Number(value) : 15000; // default 15000
  }

  async upsert(key: string, value: string, label?: string) {
    const setting = await this.prisma.setting.upsert({
      where: { key },
      update: { value, ...(label ? { label } : {}) },
      create: { key, value, label: label || key },
    });
    return { setting };
  }

  async upsertMultiple(settings: { key: string; value: string; label?: string }[]) {
    const results = [];
    for (const s of settings) {
      const setting = await this.prisma.setting.upsert({
        where: { key: s.key },
        update: { value: s.value, ...(s.label ? { label: s.label } : {}) },
        create: { key: s.key, value: s.value, label: s.label || s.key },
      });
      results.push(setting);
    }
    return { settings: results };
  }
}
