import { IsString, IsOptional, IsBoolean, IsArray, IsNumber, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsString()
  addressId: string;

  @IsOptional()
  @IsArray()
  items?: { productId: string; quantity: number }[];

  @IsOptional()
  @IsBoolean()
  fromCart?: boolean;

  @IsOptional()
  @IsString()
  voucherCode?: string;

  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

export class CancelOrderDto {
  @IsString()
  reason: string;
}
