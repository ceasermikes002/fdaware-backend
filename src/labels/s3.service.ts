import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { S3_CONFIG } from '../config/s3.config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private s3 = new S3Client({
    region: S3_CONFIG.region,
    credentials: {
      accessKeyId: S3_CONFIG.accessKeyId,
      secretAccessKey: S3_CONFIG.secretAccessKey,
    },
  });

  async uploadFile(fileBuffer: Buffer, fileName: string, mimetype: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimetype,
    });
    await this.s3.send(command);
    return `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.region}.amazonaws.com/${fileName}`;
  }

  async getPresignedUrl(fileName: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: fileName,
    });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }
} 