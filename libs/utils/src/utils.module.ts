import { CustomRedisService } from '@app/utils/cache';
import { GoogleGmailService, GoogleClientService } from '@app/utils/google';
import { NhnCloudService } from '@app/utils/nhn-cloud';
import { PrismaService } from '@app/utils/prisma';
import { S3Module } from '@app/utils/s3';

import { S3 } from '@aws-sdk/client-s3';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { Global, Module } from '@nestjs/common';
import * as process from 'process';

import { QueueModule } from './queue';

const redis = [
  RedisModule.forRoot({
    config: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    },
  }),
];

const s3Provider = [
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
];

@Global()
@Module({
  imports: [...redis, QueueModule, S3Module],
  providers: [
    ...s3Provider,
    CustomRedisService,
    NhnCloudService,
    PrismaService,
    GoogleClientService,
    GoogleGmailService,
  ],
  exports: [
    CustomRedisService,
    NhnCloudService,
    PrismaService,
    GoogleGmailService,
    QueueModule,
    S3Module,
  ],
})
export class UtilsModule {}
