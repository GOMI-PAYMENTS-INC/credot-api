import {
  CrawlingService,
  InnopaySecondaryAuthService,
} from '@app/domain/crawling';
import { delay } from '@app/utils';
import { PrismaService } from '@app/utils/prisma';
import { CrawlingQueueType } from '@app/utils/queue';

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawlingType } from '@prisma/client';
import { customAlphabet } from 'nanoid';

@Injectable()
export class InnopayBatch {
  private readonly logger = new Logger(InnopayBatch.name);

  constructor(
    private prisma: PrismaService,
    private innopaySecondaryAuthService: InnopaySecondaryAuthService,
    private crawlingService: CrawlingService,
  ) {}

  /*** 이노페이 2차 인증 처리 (한국시간 오전 6시 00분, UTC: 매일 오후 9시) ***/
  @Cron(CronExpression.EVERY_DAY_AT_9PM)
  async innopaySecondaryAuth() {
    const list = await this.prisma.crawlingInfo.findMany({
      where: {
        type: CrawlingType.INNOPAY,
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
      this.logger.log(`이노페이 2차 인증 크롤링 요청 목록이 없습니다.`);
      return;
    }

    for (const item of list) {
      await this.innopaySecondaryAuthService.crawling({
        loginId: item.accountId,
        password: item.password,
        requestId: customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)(),
      });

      await delay(2000);
    }
  }

  /*** 이노페이 거래내역 크롤링 생성 (한국시간 오전 9시 15분, UTC: 자정 15분) ***/
  @Cron('15 0 * * *')
  async makeInnopayCrawling() {
    this.logger.log(`이노페이 거래내역 크롤링 생성 요청`);
    try {
      const list = await this.prisma.crawlingInfo.findMany({
        where: {
          type: CrawlingType.INNOPAY,
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
        this.logger.log(`이노페이 거래내역 크롤링 요청 목록이 없습니다.`);
        return;
      }

      await Promise.all(
        list.map((item) =>
          this.crawlingService.request({
            password: item.password,
            loginId: item.accountId,
            crawlingQueueType: CrawlingQueueType.INNOPAY,
            type: item.type,
            requestId: customAlphabet(
              '1234567890abcdefghijklmnopqrstuvwxyz',
              10,
            )(),
            userId: item.userId,
            isBatch: true,
          }),
        ),
      );

      this.logger.log(`이노페이 거래내역 크롤링 생성 완료`);
    } catch (error) {
      this.logger.error(JSON.stringify(error));
      this.logger.error(`이노페이 거래내역 크롤링 생성 요청 오류`);
    }
  }
}
