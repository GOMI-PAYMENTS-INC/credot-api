import { CrawlingService } from '@app/domain/crawling';
import { PrismaService } from '@app/utils/prisma';
import { CrawlingQueueType } from '@app/utils/queue';

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CrawlingType } from '@prisma/client';
import { customAlphabet } from 'nanoid';

@Injectable()
export class CreditFinanceBatch {
  private readonly logger = new Logger(CreditFinanceBatch.name);

  constructor(
    private prisma: PrismaService,
    private crawlingService: CrawlingService,
  ) {}

  /*** 여신 금융 승인 정보 크롤링 요청 생성 (한국시간 오전 9시 30분, UTC: 자정 30분) ***/
  @Cron('*/15 0-2 * * *')
  async makeCreditFinanceApprovalCrawling() {
    this.logger.log(`여신 금융 승인 크롤링 생성 요청`);
    try {
      const list = await this.prisma.crawlingInfo.findMany({
        where: {
          type: CrawlingType.CREDIT_FINANCE,
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
        this.logger.log(`여신 금융 승인 크롤링 요청 목록이 없습니다.`);
        return;
      }

      await Promise.all(
        list.map((item) =>
          this.crawlingService.request({
            password: item.password,
            loginId: item.accountId,
            crawlingQueueType: CrawlingQueueType.CREDIT_FINANCE_APPROVE,
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

      this.logger.log(`여신 금융 승인 크롤링 생성 완료`);
    } catch (error) {
      this.logger.error(JSON.stringify(error));
      this.logger.error(`여신 금융 승인 크롤링 생성 요청 오류`);
    }
  }

  /*** 여신 금융 매입 크롤링 요청 생성 (한국시간 오전 9시 30분, UTC: 자정 30분) ***/
  @Cron('*/15 0-2 * * *')
  async makeCreditFinancePurchaseCrawling() {
    this.logger.log(`여신 금융 매입 크롤링 생성 요청 `);
    try {
      const list = await this.prisma.crawlingInfo.findMany({
        where: {
          type: CrawlingType.CREDIT_FINANCE,
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
        this.logger.log(`여신 금융 매입 크롤링 요청 목록이 없습니다.`);
        return;
      }

      await Promise.all(
        list.map((item) =>
          this.crawlingService.request({
            password: item.password,
            loginId: item.accountId,
            crawlingQueueType: CrawlingQueueType.CREDIT_FINANCE_PURCHASE,
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

      this.logger.log(`여신 금융 매입 크롤링 생성 완료`);
    } catch (error) {
      this.logger.error(JSON.stringify(error));
      this.logger.error(`여신 금융 매입 크롤링 생성 요청 오류`);
    }
  }
}
