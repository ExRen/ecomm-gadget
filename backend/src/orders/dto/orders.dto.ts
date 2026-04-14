import {
  IsString, IsOptional, IsBoolean, IsArray, IsInt, Min, Max,
  ValidateNested, IsUUID, ArrayMinSize, ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * SEK-003: OrderItemDto explicitly defines ONLY productId and quantity.
 * There is NO price field — price is always fetched from the database server-side.
 * This prevents price tampering via modified HTTP payloads.
 */
export class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(100) // Prevent DoS via oversized single-item quantity
  quantity: number;

  // SECURITY: No `price` field here — price is server-side only
}

export class CreateOrderDto {
  @IsUUID()
  addressId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50) // Limit items per order to prevent abuse
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

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
