import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join, extname } from 'path';
import FormData from 'form-data';
import axios from 'axios';

/**
 * Handles image uploads with production relay support.
 * 
 * PROBLEM: Local and production share the same database but have different
 * file systems. When uploading from local, the file only exists on the local
 * PC, but the URL in the database points to the production VPS.
 * 
 * SOLUTION: This service uploads the file to the production VPS via its
 * upload endpoint, so the file always ends up on the correct server.
 * In production, files are saved directly to disk (normal behavior).
 */
@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);
  private readonly isProduction: boolean;
  private readonly publicBackendUrl: string;
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.isProduction = configService.get('NODE_ENV') === 'production';
    this.publicBackendUrl = configService.get('PUBLIC_BACKEND_URL') || `http://localhost:${configService.get('PORT') || 3001}`;
    this.uploadDir = join(process.cwd(), 'uploads', 'products');
  }

  /**
   * Process uploaded files and return their public URLs.
   * 
   * - In PRODUCTION: files are already on disk via Multer, just build the URL
   * - In DEVELOPMENT: forward the file to the production server via HTTP,
   *   then use the production URL in the database
   */
  async processUploadedFiles(
    files: Express.Multer.File[],
  ): Promise<{ url: string; publicId: string }[]> {
    if (!files || files.length === 0) return [];

    if (this.isProduction) {
      // Production: files already saved by Multer, just build URLs
      return files.map((file, idx) => ({
        url: `${this.publicBackendUrl}/uploads/products/${file.filename}`,
        publicId: `product_${Date.now()}_${idx}`,
      }));
    }

    // Development: relay files to production VPS
    return this.relayToProduction(files);
  }

  /**
   * Relay uploaded files to the production backend.
   * The production backend will save them to its disk and return the URLs.
   */
  private async relayToProduction(
    files: Express.Multer.File[],
  ): Promise<{ url: string; publicId: string }[]> {
    const prodUploadUrl = `${this.publicBackendUrl}/api/v1/uploads/relay`;

    try {
      const formData = new FormData();
      for (const file of files) {
        const filePath = file.path || join(this.uploadDir, file.filename);
        if (existsSync(filePath)) {
          formData.append('images', readFileSync(filePath), {
            filename: file.filename,
            contentType: file.mimetype,
          });
        }
      }

      const response = await axios.post(prodUploadUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-Upload-Relay-Key': this.configService.get('UPLOAD_RELAY_SECRET') || 'relay-secret-key',
        },
        timeout: 30000,
        maxContentLength: 25 * 1024 * 1024,
      });

      const result = response.data?.data?.urls || response.data?.urls || [];
      this.logger.log(`Relayed ${files.length} file(s) to production successfully`);

      // Clean up local temp files
      for (const file of files) {
        const filePath = file.path || join(this.uploadDir, file.filename);
        if (existsSync(filePath)) {
          try { unlinkSync(filePath); } catch {}
        }
      }

      return result;
    } catch (error: any) {
      this.logger.warn(
        `Failed to relay to production (${error.message}). ` +
        `Falling back to local storage with production URL.`,
      );

      // Fallback: keep files locally but store production URL
      // (images will only be visible from local, which is expected behavior)
      return files.map((file, idx) => ({
        url: `${this.publicBackendUrl}/uploads/products/${file.filename}`,
        publicId: `product_${Date.now()}_${idx}`,
      }));
    }
  }
}
