import { CrawlingService } from '@app/domain/crawling';
import { PrismaService } from '@app/utils/prisma';
import { CrawlingQueueType } from '@app/utils/queue';

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawlingType } from '@prisma/client';
import { customAlphabet } from 'nanoid';

@Injectable()
export class EasyshopBatch {
  private readonly logger = new Logger(EasyshopBatch.name);

  constructor(
    private prisma: PrismaService,
    private crawlingService: CrawlingService,
  ) {}

  /*** 이지샵 매출 정보 크롤링 요청 생성 ***/
  @Cron(CronExpression.EVERY_30_MINUTES)
  async makeEasyshopSalesCrawling() {
    this.logger.log(`이지샵 매출 크롤링 생성 요청`);
    try {
      const list = await this.prisma.crawlingInfo.findMany({
        where: {
          type: CrawlingType.EASYSHOP,
          User: {
            NOT: {
              name: {
                startsWith: '조회_',
              },
            },
          },
        },
      });
      if (!list.length) {
        this.logger.log(`이지샵 매출 크롤링 요청 목록이 없습니다.`);
        return;
      }

      await Promise.all(
        list.map((item) =>
          this.crawlingService.request({
            password: item.password,
            loginId: item.accountId,
            crawlingQueueType: CrawlingQueueType.EASY_SHOP_SALES,
            type: item.type as CrawlingType,
            requestId: customAlphabet(
              '1234567890abcdefghijklmnopqrstuvwxyz',
              10,
            )(),
            userId: item.userId,
            isBatch: true,
          }),
        ),
      );

      this.logger.log(`이지샵 매출 크롤링 생성 완료`);
    } catch (error) {
      this.logger.error(JSON.stringify(error));
      this.logger.error(`이지샵 매출 크롤링 생성 요청 오류`);
    }
  }

  /*** 이지샵 입출금 정보 크롤링 요청 생성 ***/
  @Cron(CronExpression.EVERY_30_MINUTES)
  async makeEasyshopDepositCrawling() {
    this.logger.log(`이지샵 입출금 크롤링 생성 요청`);
    try {
      const list = await this.prisma.crawlingInfo.findMany({
        where: {
          type: CrawlingType.EASYSHOP,
          User: {
            NOT: {
              name: {
                startsWith: '조회_',
              },
            },
          },
        },
      });
      if (!list.length) {
        this.logger.log(`이지샵 입출금 크롤링 요청 목록이 없습니다.`);
        return;
      }

      await Promise.all(
        list.map((item) =>
          this.crawlingService.request({
            password: item.password,
            loginId: item.accountId,
            crawlingQueueType: CrawlingQueueType.EASY_SHOP_DEPOSIT,
            type: item.type as CrawlingType,
            requestId: customAlphabet(
              '1234567890abcdefghijklmnopqrstuvwxyz',
              10,
            )(),
            userId: item.userId,
            isBatch: true,
          }),
        ),
      );

      this.logger.log(`이지샵 입출금 크롤링 생성 완료`);
    } catch (error) {
      this.logger.error(JSON.stringify(error));
      this.logger.error(`이지샵 입출금 크롤링 생성 요청 오류`);
    }
  }
}
