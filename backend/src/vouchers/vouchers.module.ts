import { Module } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { VouchersController, AdminVouchersController } from './vouchers.controller';

@Module({
  controllers: [VouchersController, AdminVouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
