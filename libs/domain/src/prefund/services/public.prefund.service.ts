import { CrawlingResponseDto, RequestCrawlingDto } from '@app/domain/crawling';
import {
  BondType,
  PrefundRecordType,
  TodayPreFundSummaryDto,
} from '@app/domain/prefund';
import { Prefund } from '@app/domain/prefund/prefund';
import { CustomRedisService } from '@app/utils/cache';
import { PrismaService } from '@app/utils/prisma';
import { CrawlingQueueService, CrawlingQueueType } from '@app/utils/queue';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { CrawlingStatus, CrawlingType } from '@prisma/client';
import * as dayjs from 'dayjs';

import { CardInfoService, PrefundService, BondService } from './';

@Injectable()
export class PublicPrefundService {
  private readonly logger = new Logger(PublicPrefundService.name);
  constructor(
    private prismaService: PrismaService,
    private crawlingQueueService: CrawlingQueueService,
    private readonly prefundService: PrefundService,
    private readonly redisService: CustomRedisService,
    private readonly cardInfoService: CardInfoService,
    private readonly bondService: BondService,
  ) {}

  async requestPublic(
    data: RequestCrawlingDto,
    requestId: string,
  ): Promise<CrawlingResponseDto[]> {
    this.logger.log(`>>>> 크롤링 요청 시작 ${requestId}`);
    let crawlingQueueTypes =
      (data.type === CrawlingType.EASYSHOP && [
        CrawlingQueueType.EASY_SHOP_SALES,
        CrawlingQueueType.EASY_SHOP_DEPOSIT,
      ]) ||
      [];
    crawlingQueueTypes =
      (data.type === CrawlingType.CREDIT_FINANCE && [
        CrawlingQueueType.CREDIT_FINANCE_FULL,
      ]) ||
      [];

    if (!crawlingQueueTypes.length) {
      throw new RuntimeException(`유효하지 않은 선정산금 요청입니다.`);
    }

    try {
      return await this.prismaService.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: requestId,
            name: `조회_${requestId}`,
          },
        });

        await tx.crawlingInfo.create({
          data: {
            type: data.type,
            accountId: data.loginId,
            password: data.password,
            userId: user.id,
          },
        });

        const result = await Promise.all(
          crawlingQueueTypes.map(async (crawlingQueueType) => {
            const crawlingForSales = await tx.crawling.create({
              data: {
                type: data.type,
                status: CrawlingStatus.REQUEST,
                requestId,
                userId: user.id,
                isBatch: false,
              },
            });

            await this.crawlingQueueService.addQueue(
              {
                type: crawlingQueueType,
                loginId: data.loginId,
                password: data.password,
                crawlingId: crawlingForSales.id,
                userId: user.id,
              },
              requestId,
            );

            return {
              crawlingId: crawlingForSales.id,
            };
          }),
        );

        this.logger.log(`>>>> 크롤링 요청 완료 ${requestId}`);
        return result;
      });
    } catch (error) {
      this.logger.error(`>>>> 크롤링 요청 실패 ${requestId}`);
      this.logger.error(error);
      throw new RuntimeException('크롤링 요청에 실패하였습니다.');
    }
  }

  async create({ targetDate, userId }): Promise<void> {
    const date = dayjs(targetDate)
      .subtract(1, 'day')
      .hour(23)
      .minute(59)
      .second(59);

    try {
      await this.prismaService.$transaction(async (tx) => {
        this.logger.log(
          `>>>>>> 선정산 데이터를 생성 시작: targetDate: ${targetDate}, transactionAt: ${date.toDate()}, userId: ${userId}`,
        );

        const prefundGroupAt = targetDate;

        // 만약 데이터가 존재했다면 제거한다.
        await tx.prefundByCard.deleteMany({
          where: {
            prefundGroupAt,
            userId,
          },
        });
        await tx.prefund.deleteMany({
          where: {
            prefundGroupAt,
            userId,
          },
        });

        // 선정할 매출 채권을 가져온다.
        const bondList: BondType[] = await this.bondService.getBondList(
          { endDate: date, userId },
          { tx },
        );
        if (!bondList.length) {
          return;
        }

        // 카드사별 정산일 정보 호출
        const businessDayStore = await this.cardInfoService.getBusinessDayStore(
          {
            userId,
            type: CrawlingType.CREDIT_FINANCE,
          },
        );

        // 카드사별 영업일 기준 정보 호출
        const byBusinessDayStore =
          await this.cardInfoService.getByBusinessDayStore({
            userId,
            type: CrawlingType.CREDIT_FINANCE,
          });

        // 카드사별 수수료 정보 호출
        const cardCommissionRateStore =
          await this.cardInfoService.getCardCommissionRateStore({
            userId,
            type: CrawlingType.CREDIT_FINANCE,
          });

        // 대체 휴일 불러오기
        const substituteHolidays =
          await this.prismaService.substituteHoliday.findMany({
            where: {
              yearMonthDate: {
                gte: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
                lte: dayjs().add(1, 'month').format('YYYY-MM-DD'),
              },
            },
            select: {
              yearMonthDate: true,
            },
          });
        const substituteHolidayList = substituteHolidays.map(
          (item) => item.yearMonthDate,
        );

        const prefund = new Prefund(
          userId,
          prefundGroupAt,
          substituteHolidayList,
          cardCommissionRateStore,
          businessDayStore,
          byBusinessDayStore,
        );

        // 카드사별 데이터 생성
        const createList: PrefundRecordType[] =
          prefund.generatePrefundData(bondList);
        await tx.prefundByCard.createMany({
          data: Object.values(
            prefund.generatePrefundDataGroupByCard(createList),
          ),
        });

        const prefundByCards = await tx.prefundByCard.findMany({
          where: {
            prefundGroupAt,
            userId,
          },
        });
        await tx.prefund.createMany({
          data: prefund.addPrefundByCard(createList, prefundByCards),
        });

        this.logger.log(
          `>>>>>> 선정산 데이터를 생성 종료: targetDate: ${targetDate}, transactionAt: ${date.toDate()}, userId: ${userId}`,
        );
      });
    } catch (error) {
      this.logger.error(
        `>>>>>> 선정산 데이터를 생성 에러: targetDate: ${targetDate}, transactionAt: ${date.toDate()}, userId: ${userId}`,
      );
      this.logger.error(error.message);
      throw new RuntimeException(error);
    }
  }

  async myPrefund(crawlingId: number): Promise<TodayPreFundSummaryDto> {
    const crawling = await this.prismaService.crawling.findFirst({
      where: {
        id: crawlingId,
      },
    });
    if (!crawling) {
      throw new BadRequestException('선정산 조회 정보를 확인할 수 없습니다.');
    }

    const key = `myPrefund_${crawling.userId}`;
    const today = dayjs().format('YYYY-MM-DD');
    const exist = await this.redisService.get(key);
    if (exist) {
      return await this.prefundService.today(
        crawling.userId,
        dayjs().add(9, 'hour').format('YYYY-MM-DD'),
      );
    }

    await this.create({
      targetDate: today,
      userId: crawling.userId,
    });

    // 선정산 데이터 생성 후 생성했다는 표시 처리
    await this.redisService.setnx(key, 1);
    return await this.prefundService.today(
      crawling.userId,
      dayjs().add(9, 'hour').format('YYYY-MM-DD'),
    );
  }
}
