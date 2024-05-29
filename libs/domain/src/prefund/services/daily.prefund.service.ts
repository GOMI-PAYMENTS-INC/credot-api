import {
  BondType,
  PrefundRecordType,
  FutureFundService,
  BondService,
  CardInfoService,
} from '@app/domain/prefund';
import { Prefund } from '@app/domain/prefund/prefund';
import { PrismaService } from '@app/utils/prisma';

import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { PrefundByCard, PrefundStatus } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class DailyPrefundService {
  private readonly logger = new Logger(DailyPrefundService.name);
  constructor(
    private prismaService: PrismaService,
    @Inject(forwardRef(() => CardInfoService))
    private readonly cardInfoService: CardInfoService,
    @Inject(forwardRef(() => BondService))
    private readonly bondService: BondService,
    @Inject(forwardRef(() => FutureFundService))
    private readonly futureFundService: FutureFundService,
  ) {}

  async create({
    targetDate,
    userId,
  }: {
    targetDate: string;
    userId: number;
  }): Promise<PrefundByCard[]> {
    const endDate = dayjs(targetDate)
      .subtract(1, 'day')
      .hour(23)
      .minute(59)
      .second(59);

    try {
      return await this.prismaService.$transaction(
        async (tx) => {
          this.logger.log(
            `>>>>>> 선정산 데이터를 생성 시작: endDate: ${endDate.toDate()}, userId: ${userId}`,
          );

          const prefundGroupAt = targetDate;

          // 만약 어제 선정산 진행되지 않았다면 제거한다.
          const previousDate = dayjs(targetDate)
            .subtract(1, 'day')
            .hour(9)
            .minute(0)
            .second(0);

          const result = await tx.prefundByCard.findMany({
            where: {
              prefundGroupAt: previousDate.format('YYYY-MM-DD'),
              userId,
              status: PrefundStatus.READY,
            },
          });
          if (result.length) {
            await tx.prefundByCard.deleteMany({
              where: {
                prefundGroupAt: previousDate.format('YYYY-MM-DD'),
                userId,
                status: PrefundStatus.READY,
              },
            });
          }

          // 만약 데이터가 존재했다면 제거한다.
          await tx.prefundByCard.deleteMany({
            where: {
              prefundGroupAt,
              userId,
            },
          });

          // 과정산(상계) 매출 채권을 가져온다.
          const setoffList: BondType[] =
            await this.bondService.getSetoffBondList(
              { endDate, userId },
              { tx },
            );

          // 선정할 매출 채권을 가져온다.
          const bondList: BondType[] = await this.bondService.getBondList(
            { endDate, userId },
            { tx },
          );

          if (!bondList.length && !setoffList.length) {
            this.logger.log(
              `>>>>>> 처리할 선정산 데이터 없음: targetDate: ${targetDate}, endDate: ${endDate.toDate()}, userId: ${userId}`,
            );
            return [];
          }

          // 카드사별 정산일 정보 호출
          const businessDayStore =
            await this.cardInfoService.getBusinessDayStore({
              userId,
            });

          // 카드사별 영업일 기준 정보
          const byBusinessDayStore =
            await this.cardInfoService.getByBusinessDayStore({
              userId,
            });

          // 카드사별 수수료 정보 호출
          const cardCommissionRateStore =
            await this.cardInfoService.getCardCommissionRateStore({
              userId,
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

          const createSetoffList: PrefundRecordType[] =
            prefund.generateSetoffData(setoffList);

          const createList: PrefundRecordType[] =
            prefund.generatePrefundData(bondList);

          const totalData = [...createList, ...createSetoffList];

          // 데일리 카드사별 선정산 데이터 생성
          await tx.prefundByCard.createMany({
            data: Object.values(
              prefund.generatePrefundDataGroupByCard(totalData),
            ),
          });

          // 데일리 선정산 내역 생성
          const prefundByCards = await tx.prefundByCard.findMany({
            where: {
              prefundGroupAt,
              userId,
            },
          });
          await tx.prefund.createMany({
            data: prefund.addPrefundByCard(totalData, prefundByCards),
          });

          // 미래 정산 상환 처리
          await this.futureFundService.repayment(userId, prefundGroupAt, {
            tx,
          });

          this.logger.log(
            `>>>>>> 선정산 데이터를 생성 종료: targetDate: ${targetDate}, endDate: ${endDate.toDate()}, userId: ${userId}`,
          );

          return prefundByCards;
        },
        {
          timeout: 10000,
        },
      );
    } catch (error) {
      this.logger.error(
        `>>>>>> 선정산 데이터를 생성 에러: targetDate: ${targetDate}, endDate: ${endDate.toDate()}, userId: ${userId}`,
      );
      this.logger.error(error.message);
      throw new RuntimeException(error);
    }
  }
}
