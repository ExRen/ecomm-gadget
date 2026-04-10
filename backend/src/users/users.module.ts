import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController, AdminCustomersController } from './users.controller';

@Module({
  controllers: [UsersController, AdminCustomersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
