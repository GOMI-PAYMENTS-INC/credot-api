import { QUEUE_NAME } from '@app/utils/queue/queue.name';

import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';

export enum CrawlingQueueType {
  EASY_SHOP_DEPOSIT = 'EASY_SHOP_DEPOSIT',
  EASY_SHOP_SALES = 'EASY_SHOP_SALES',
  CREDIT_FINANCE_APPROVE = 'CREDIT_FINANCE_APPROVE',
  CREDIT_FINANCE_PURCHASE = 'CREDIT_FINANCE_PURCHASE',
  CREDIT_FINANCE_FULL = 'CREDIT_FINANCE_FULL',
  INNOPAY_AUTH = 'INNOPAY_AUTH',
  INNOPAY = 'INNOPAY',
}

export const MAX_CRAWLING_RETRY_COUNT = 5;

@Injectable()
export class CrawlingQueueService {
  private readonly logger = new Logger(CrawlingQueueService.name);

  constructor(@InjectQueue(QUEUE_NAME.CRAWLING) private crawlingQueue: Queue) {}

  async failedQueueList() {
    return await this.crawlingQueue.getFailed();
  }

  async delayedQueueList() {
    return await this.crawlingQueue.getDelayed();
  }

  async activeQueueList() {
    return await this.crawlingQueue.getActive();
  }

  async job(jobId: string) {
    const job = await this.crawlingQueue.getJob(jobId);
    return job;
  }

  async addQueue(
    data: {
      crawlingId: number;
      userId: number;
      loginId: string;
      password: string;
      type: CrawlingQueueType;
    },
    requestId: string,
  ): Promise<boolean> {
    try {
      await this.crawlingQueue.add(
        data.type,
        {
          ...data,
          requestId,
        },
        {
          attempts: MAX_CRAWLING_RETRY_COUNT,
          backoff: {
            type: 'fixed',
            delay: 3000,
          },
        },
      );
      this.logger.log('>>>>> 크롤링 Job 등록', requestId);
      return true;
    } catch (error) {
      this.logger.error('>>>>> 크롤링 Job 등록 실패', requestId);
      this.logger.error(error);
      return false;
    }
  }
}
