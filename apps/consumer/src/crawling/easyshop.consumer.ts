import { CrawlingService, EasyshopDepositService } from '@app/domain/crawling';
import { delay } from '@app/utils';
import { CrawlingQueueType, QUEUE_NAME } from '@app/utils/queue';

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { CrawlingStatus } from '@prisma/client';
import { customAlphabet } from 'nanoid';

@Processor(QUEUE_NAME.CRAWLING)
export class EasyshopConsumer {
  private readonly logger = new Logger(EasyshopConsumer.name);

  constructor(
    private readonly easyshopDepositService: EasyshopDepositService,
    private readonly crawlingService: CrawlingService,
  ) {}

  @Process({
    name: CrawlingQueueType.EASY_SHOP_DEPOSIT,
    concurrency: 5,
  })
  async easyshopCrawling(job) {
    const input: {
      requestId: string;
      loginId: string;
      password: string;
      crawlingId: number;
      userId: number;
    } = job.data;

    try {
      const filePath = `crawling_${new Date().getTime()}_${customAlphabet(
        '1234567890',
        5,
      )()}`;

      while (true) {
        try {
          const exist = await this.crawlingService.findById(input.crawlingId);
          if (exist) {
            break;
          }
          await delay(500);
        } catch (error) {}
      }

      await this.crawlingService.updateStatus(
        input.crawlingId,
        CrawlingStatus.RECEIVE,
      );
      await this.easyshopDepositService.crawling({
        filePath: filePath,
        requestId: input.requestId,
        loginId: input.loginId,
        password: input.password,
      });
      await this.crawlingService.uploadToS3({
        filePath: `./files/${filePath}/입금현황 - 일별상세.xlsx`,
        key: `crawling/${filePath}_deposit.xlsx`,
        requestId: input.requestId,
        crawlingId: input.crawlingId,
      });
      await this.easyshopDepositService.loadData({
        filePath: `./files/${filePath}/입금현황 - 일별상세.xlsx`,
        requestId: input.requestId,
        // crawlingId: input.crawlingId,
        userId: input.userId,
      });
      await this.crawlingService.updateStatus(
        input.crawlingId,
        CrawlingStatus.DONE,
      );
    } catch (error) {
      await this.crawlingService.updateStatus(
        input.crawlingId,
        CrawlingStatus.FAILED,
        error.message,
      );
      this.logger.error(error);
      throw new RuntimeException(error);
    }
  }
}
