import { CardNumberQueueService } from '@app/utils/queue/card-number-queue.service';
import { CrawlingQueueService } from '@app/utils/queue/crawling-queue.service';
import { QUEUE_NAME } from '@app/utils/queue/queue.name';

import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
      prefix: process.env.NODE_ENV,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    BullModule.registerQueue({
      name: QUEUE_NAME.CRAWLING,
    }),
    BullModule.registerQueue({
      name: QUEUE_NAME.CARD_NUMBER,
    }),
  ],
  providers: [CrawlingQueueService, CardNumberQueueService],
  exports: [CrawlingQueueService, CardNumberQueueService],
})
export class QueueModule {}
