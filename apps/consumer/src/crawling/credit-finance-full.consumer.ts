import {
  CrawlingService,
  CreditFinanceApproveService,
  CreditFinanceCardInfoService,
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
import { CrawlingStatus, CrawlingType } from '@prisma/client';
import { Job } from 'bull';

@Processor(QUEUE_NAME.CRAWLING)
export class CreditFinanceFullConsumer {
  private readonly logger = new Logger(CreditFinanceFullConsumer.name);

  constructor(
    private readonly creditFinancePurchaseService: CreditFinancePurchaseService,
    private readonly creditFinanceCardInfoService: CreditFinanceCardInfoService,
    private readonly creditFinanceApproveService: CreditFinanceApproveService,
    private readonly crawlingService: CrawlingService,
  ) {}

  @Process({
    name: CrawlingQueueType.CREDIT_FINANCE_FULL,
    concurrency: 3,
  })
  async creditFinanceConsumerCrawling(job: Job) {
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
       카드사 수수료/정산주기 정보
       ***/
      const cardInfos = await this.creditFinanceCardInfoService.crawling({
        requestId: input.requestId,
        loginId: input.loginId,
        password: input.password,
      });
      await this.creditFinanceCardInfoService.loadData({
        userId: input.userId,
        type: CrawlingType.CREDIT_FINANCE,
        data: cardInfos,
      });

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
