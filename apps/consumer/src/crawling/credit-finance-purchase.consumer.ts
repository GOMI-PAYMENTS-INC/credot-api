import {
  CrawlingService,
  CreditFinancePurchaseService,
} from '@app/domain/crawling';
import { delay } from '@app/utils';
import {
  CrawlingQueueType,
  MAX_CRAWLING_RETRY_COUNT,
  QUEUE_NAME,
} from '@app/utils/queue';

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { CrawlingStatus } from '@prisma/client';

@Processor(QUEUE_NAME.CRAWLING)
export class CreditFinancePurchaseConsumer {
  private readonly logger = new Logger(CreditFinancePurchaseConsumer.name);

  constructor(
    private readonly creditFinancePurchaseService: CreditFinancePurchaseService,
    private readonly crawlingService: CrawlingService,
  ) {}

  @Process({
    name: CrawlingQueueType.CREDIT_FINANCE_PURCHASE,
    concurrency: 3,
  })
  async creditFinanceConsumerCrawling(job) {
    const input: {
      requestId: string;
      loginId: string;
      password: string;
      crawlingId: number;
      userId: number;
    } = job.data;

    try {
      while (true) {
        try {
          const exist = await this.crawlingService.findById(input.crawlingId);
          if (exist) {
            break;
          }
          await delay(500);
        } catch (error) {}
        1;
      }

      await this.crawlingService.updateStatus(
        input.crawlingId,
        CrawlingStatus.RECEIVE,
      );

      /***
       매입 데이터 크롤링
       ***/
      const filePathsForPurchase =
        await this.creditFinancePurchaseService.crawling({
          userId: input.userId,
          requestId: input.requestId,
          loginId: input.loginId,
          password: input.password,
        });

      await Promise.all(
        filePathsForPurchase.map((filePath) =>
          this.crawlingService.uploadToS3({
            filePath: `./files/${filePath}/기간별매입내역_세부내역.xls`,
            key: `crawling/${filePath}_purchase.xlsx`,
            requestId: input.requestId,
            crawlingId: input.crawlingId,
          }),
        ),
      );
      await Promise.all(
        filePathsForPurchase.map((filePath) =>
          this.creditFinancePurchaseService.loadData({
            filePath: `./files/${filePath}/기간별매입내역_세부내역.xls`,
            requestId: input.requestId,
            userId: input.userId,
          }),
        ),
      );

      await this.crawlingService.updateStatus(
        input.crawlingId,
        CrawlingStatus.DONE,
        null,
        job.attemptsMade + 1,
      );
    } catch (error) {
      if (job.attemptsMade + 1 === MAX_CRAWLING_RETRY_COUNT) {
        await this.crawlingService.updateStatus(
          input.crawlingId,
          CrawlingStatus.FAILED,
          error.message,
          job.attemptsMade + 1,
        );
      }

      this.logger.error(error);
      throw new RuntimeException(error);
    }
  }
}
