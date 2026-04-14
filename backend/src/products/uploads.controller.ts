import {
  Controller, Post, UploadedFiles, UseInterceptors,
  BadRequestException, Headers, Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Endpoint for receiving relayed file uploads from development environments.
 * This is ONLY used in production to accept files forwarded from local dev.
 * 
 * Authentication: uses a shared UPLOAD_RELAY_SECRET header key,
 * separate from JWT auth to avoid circular dependencies.
 */
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private configService: ConfigService) {}

  @Post('relay')
  @Public() // Bypasses JWT — uses its own secret key auth
  @SkipThrottle()
  @UseInterceptors(FilesInterceptor('images', 5))
  async relayUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Headers('x-upload-relay-key') relayKey: string,
  ) {
    // Verify relay secret
    const expectedKey = this.configService.get('UPLOAD_RELAY_SECRET') || 'relay-secret-key';
    if (relayKey !== expectedKey) {
      throw new BadRequestException('Invalid relay key');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No files received');
    }

    const publicUrl = this.configService.get('PUBLIC_BACKEND_URL') || `http://localhost:${this.configService.get('PORT') || 3001}`;

    const urls = files.map((file, idx) => ({
      url: `${publicUrl}/uploads/products/${file.filename}`,
      publicId: `product_${Date.now()}_${idx}`,
    }));

    this.logger.log(`Relay received ${files.length} file(s): ${files.map(f => f.filename).join(', ')}`);

    return { urls };
  }
}
