import { CrawlingService, InnopayService } from '@app/domain/crawling';
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
import { Job } from 'bull';
import { customAlphabet } from 'nanoid';

@Processor(QUEUE_NAME.CRAWLING)
export class InnopayConsumer {
  private readonly logger = new Logger(InnopayConsumer.name);

  constructor(
    private readonly innopayService: InnopayService,
    private readonly crawlingService: CrawlingService,
  ) {}

  @Process({
    name: CrawlingQueueType.INNOPAY,
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

      /***
       거래내역 크롤링
       ***/
      const fileName = await this.innopayService.crawling({
        filePath: filePath,
        requestId: input.requestId,
        loginId: input.loginId,
        password: input.password,
      });
      if (!fileName) {
        this.logger.error(
          `>>> 이노페이 크롤링 결과 파일명이 존재하지 않습니다. : ${input.requestId}`,
        );
        return;
      }

      await this.crawlingService.uploadToS3({
        filePath: `./files/${filePath}/${fileName}`,
        key: `crawling/${filePath}_innopay.xlsx`,
        requestId: input.requestId,
        crawlingId: input.crawlingId,
      });
      await this.innopayService.loadData({
        filePath: `./files/${filePath}/${fileName}`,
        requestId: input.requestId,
        userId: input.userId,
      });

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
