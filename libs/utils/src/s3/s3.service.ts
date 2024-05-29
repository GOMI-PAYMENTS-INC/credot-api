import { S3 } from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import * as process from 'process';

@Injectable()
export class S3Service {
  constructor(@Inject('S3') private readonly s3: S3) {}

  async get({ key }: { key: string }): Promise<ArrayBuffer> {
    try {
      const s3Object = await this.s3.getObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `${process.env.APP_ENV}/${key}`,
      });
      const result = await s3Object.Body.transformToByteArray();
      return result.buffer;
    } catch (error) {
      throw new RuntimeException(error);
    }
  }

  async put({ key, buffer }: { key: string; buffer: Buffer }): Promise<void> {
    try {
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `${process.env.APP_ENV}/${key}`,
        Body: buffer,
      };

      await this.s3.putObject(uploadParams);
    } catch (error) {
      throw new RuntimeException(error);
    }
  }
}
