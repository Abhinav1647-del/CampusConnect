import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import 'multer';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private s3Client: S3Client | null = null;
  private readonly storageProvider: string;
  private readonly localUploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.storageProvider = configService.get('STORAGE_PROVIDER', 'local');
    this.localUploadDir = path.join(process.cwd(), 'uploads');

    if (this.storageProvider === 's3') {
      const endpoint = configService.get('S3_ENDPOINT');
      const region = configService.get('S3_REGION', 'auto');
      const accessKeyId = configService.get('S3_ACCESS_KEY_ID');
      const secretAccessKey = configService.get('S3_SECRET_ACCESS_KEY');

      if (!endpoint || !accessKeyId || !secretAccessKey) {
        this.logger.warn(
          'S3 storage configured but credentials missing. Falling back to local storage.',
        );
        this.storageProvider = 'local';
      } else {
        this.s3Client = new S3Client({
          endpoint,
          region,
          credentials: { accessKeyId, secretAccessKey },
        });
      }
    }

    if (this.storageProvider === 'local') {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
      this.logger.log(
        `Using local file storage at ${this.localUploadDir}. NOT suitable for production.`,
      );
    }
  }

  validateFile(file: Express.Multer.File) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; key: string }> {
    this.validateFile(file);

    const ext = path.extname(file.originalname).toLowerCase();
    const key = `${folder}/${randomUUID()}${ext}`;

    if (this.storageProvider === 's3' && this.s3Client) {
      const bucket = this.configService.get('S3_BUCKET', 'campusconnect');
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      const publicUrl = this.configService.get('S3_PUBLIC_URL', '');
      return { url: `${publicUrl}/${key}`, key };
    }

    // Local fallback
    const localPath = path.join(this.localUploadDir, key);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, file.buffer);
    return { url: `/uploads/${key}`, key };
  }

  async deleteFile(key: string) {
    if (this.storageProvider === 's3' && this.s3Client) {
      const bucket = this.configService.get('S3_BUCKET', 'campusconnect');
      await this.s3Client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      );
      return;
    }
    const localPath = path.join(this.localUploadDir, key);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  }
}
