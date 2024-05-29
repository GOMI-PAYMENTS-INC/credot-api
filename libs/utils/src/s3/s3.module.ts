import { S3Service } from '@app/utils/s3';

import { S3 } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';
import * as process from 'process';

@Module({
  providers: [
    {
      provide: 'S3', // 원하는 토큰 이름을 지정
      useValue: new S3({
        region: process.env.AWS_REGION, // AWS 리전 이름
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }),
    },
    S3Service,
  ],
  exports: [S3Service],
})
export class S3Module {}
