import {
  CrawlingService,
  CreditFinanceApproveService,
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
export class CreditFinanceApprovalConsumer {
  private readonly logger = new Logger(CreditFinanceApprovalConsumer.name);

  constructor(
    private readonly creditFinanceApproveService: CreditFinanceApproveService,
    private readonly crawlingService: CrawlingService,
  ) {}

  @Process({
    name: CrawlingQueueType.CREDIT_FINANCE_APPROVE,
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
      }

      await this.crawlingService.updateStatus(
        input.crawlingId,
        CrawlingStatus.RECEIVE,
      );

      /***
       승인 데이터 크롤링
       ***/
      const filePaths = await this.creditFinanceApproveService.crawling({
        userId: input.userId,
        requestId: input.requestId,
        loginId: input.loginId,
        password: input.password,
      });
      await Promise.all(
        filePaths.map((filePath) =>
          this.crawlingService.uploadToS3({
            filePath: `./files/${filePath}/기간별승인내역_세부내역.xls`,
            key: `crawling/${filePath}_approval.xlsx`,
            requestId: input.requestId,
            crawlingId: input.crawlingId,
          }),
        ),
      );

      await Promise.all(
        filePaths.map((filePath) =>
          this.creditFinanceApproveService.loadData({
            filePath: `./files/${filePath}/기간별승인내역_세부내역.xls`,
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
