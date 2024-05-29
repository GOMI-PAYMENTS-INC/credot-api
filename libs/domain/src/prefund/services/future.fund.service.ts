import {
  ApplyFutureFundDto,
  PrefundListFilterType,
  TodayFutureFundDto,
  FutureFundDto,
  TodayFutureFundApplyDto,
  RepaymentFutureFundDto,
} from '@app/domain/prefund';
import { FutureFundMatrixSummaryDto } from '@app/domain/prefund/dtos/prefund-matrix-summary.dto';
import { PrismaService } from '@app/utils/prisma';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  FutureFund,
  FutureFundStatus,
  FutureFundType,
  PrismaClient,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import * as dayjs from 'dayjs';
import { groupBy, sumBy } from 'lodash';

export const getFutureFundDoneCount = (
  applyList: number[],
  repaymentPriceList: number[],
) => {
  let tempApply = applyList.shift() || 0;
  let tempRepaymentPrice = repaymentPriceList.shift() || 0;
  let doneCount = 0;

  // 신청 금액이 pop 될 때마다 완료 수가 증가
  while (repaymentPriceList.length) {
    // 0 이상일 경우, 상환 금액은 다음 걸로 변경해주고 신청 금액에서 상환 금액 빼준다.
    if (tempApply + tempRepaymentPrice > 0) {
      tempApply += tempRepaymentPrice;
      tempRepaymentPrice = repaymentPriceList.shift() || 0;
    } else if (tempApply + tempRepaymentPrice === 0) {
      // 0 일 경우, 상환 금액, 신청 금액 모두 변경
      tempApply = applyList.shift() || 0;
      tempRepaymentPrice = repaymentPriceList.shift() || 0;
      doneCount += 1;
    } else if (tempApply + tempRepaymentPrice < 0) {
      // 0 이하일 경우, 신청 금액은 다음 걸로 변경해주고 상환 금액에서 상환 금액 빼준다.
      tempRepaymentPrice += tempApply;
      tempApply = applyList.shift() || 0;
      doneCount += 1;
    }
  }

  return doneCount;
};

@Injectable()
export class FutureFundService {
  private readonly logger = new Logger(FutureFundService.name);

  constructor(private prismaService: PrismaService) {}

  async matrixSummary(): Promise<FutureFundMatrixSummaryDto> {
    /* 미래정산 완료 건 */
    const result = await this.prismaService.futureFund.groupBy({
      by: ['fundGroupAt', 'userId'],
      where: {
        futureFundType: {
          notIn: [FutureFundType.REPAYMENT_READY],
        },
      },
      _sum: {
        applyPrice: true,
        repaymentPrice: true,
      },
      orderBy: {
        fundGroupAt: 'asc',
      },
    });
    const groupByUserId = groupBy(result, (item) => item.userId);
    const totalCounts = Object.keys(groupByUserId).map((userId) => {
      const item = groupByUserId[userId];
      const applyList = item.map((i) => i._sum.applyPrice);
      const repaymentList = item.map((i) => i._sum.repaymentPrice);
      return getFutureFundDoneCount(applyList, repaymentList);
    });
    /* 미래정산 완료 건 */

    /* 누적 지급 금액 */
    const totalFutureFund = await this.prismaService.futureFund.aggregate({
      where: {
        futureFundType: {
          notIn: [FutureFundType.REPAYMENT_READY],
        },
      },
      _sum: {
        applyPrice: true,
      },
    });
    /* 누적 지급 금액 */

    /* 누적 회수 금액 */
    const totalRepaymentPrice = await this.prismaService.futureFund.aggregate({
      where: {
        futureFundType: {
          notIn: [FutureFundType.REPAYMENT_READY],
        },
      },
      _sum: {
        repaymentPrice: true,
      },
    });
    /* 누적 지급 금액 */

    /* 누적 수익금 */
    const totalProfit = await this.prismaService.futureFund.aggregate({
      where: {
        futureFundType: {
          notIn: [FutureFundType.REPAYMENT_READY],
        },
      },
      _sum: {
        repaymentFees: true,
      },
    });
    /* 누적 수익금 */

    return plainToInstance(FutureFundMatrixSummaryDto, {
      totalDoneCount: sumBy(totalCounts),
      totalFutureFundAmount: totalFutureFund._sum.applyPrice,
      totalReturnAmount: Math.abs(totalRepaymentPrice._sum.repaymentPrice),
      totalProfit: Math.abs(totalProfit._sum.repaymentFees),
    });
  }

  async today(today: string, userId: number): Promise<TodayFutureFundDto> {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
    });
    const [result] = await this.prismaService.futureFund.groupBy({
      by: ['userId'],
      where: {
        fundGroupAt: today,
        futureFundType: {
          notIn: [FutureFundType.REPAYMENT_READY],
        },
        userId,
      },
      _sum: {
        price: true,
        accumulatedFees: true,
        applyPrice: true,
        accrualFees: true,
        repaymentFees: true,
        repaymentPrice: true,
      },
    });

    const [futureFundRepaymentReadyInfo] =
      await this.prismaService.futureFund.groupBy({
        by: ['userId'],
        where: {
          fundGroupAt: today,
          futureFundType: FutureFundType.REPAYMENT_READY,
          userId,
        },
        _sum: {
          repaymentFees: true,
          repaymentPrice: true,
        },
      });

    if (!result) {
      return plainToInstance(TodayFutureFundDto, {
        futureFundInUse: 0,
        accumulatedFees: 0,
        applyPrice: 0,
        accrualFees: 0,
        repaymentFees: 0,
        repaymentPrice: 0,
        limit: user.limitFutureFund,
      });
    }

    const futureFundInUse =
      result._sum.applyPrice + result._sum.price + result._sum.repaymentPrice;
    return plainToInstance(TodayFutureFundDto, {
      futureFundInUse, // 이용중 미래 정산 금액
      limit: user.limitFutureFund - futureFundInUse, // 미래 정산 한도
      accumulatedFees: result._sum.accumulatedFees,
      applyPrice: result._sum.applyPrice,
      accrualFees: result._sum.accrualFees,
      repaymentFees:
        result._sum.repaymentFees +
        (futureFundRepaymentReadyInfo?._sum?.repaymentFees || 0),
      repaymentPrice:
        result._sum.repaymentPrice +
        (futureFundRepaymentReadyInfo?._sum?.repaymentPrice || 0),
    });
  }

  async findTodayApply(
    today: string,
    userId: number,
  ): Promise<TodayFutureFundApplyDto | null> {
    const apply = await this.prismaService.futureFundApply.findFirst({
      where: {
        applyAt: today,
        status: FutureFundStatus.READY,
        userId,
      },
    });
    if (!apply) {
      return null;
    }

    return plainToInstance(TodayFutureFundApplyDto, apply);
  }

  async list({
    startAt,
    endAt,
    userId,
  }: PrefundListFilterType): Promise<FutureFundDto[]> {
    const result = await this.prismaService.futureFund.groupBy({
      by: ['fundGroupAt', 'userId'],
      where: {
        ...(userId && { userId }),
        ...(startAt &&
          endAt && {
            fundGroupAt: {
              gte: startAt,
              lte: endAt,
            },
          }),
        futureFundType: {
          notIn: [FutureFundType.REPAYMENT_READY],
        },
      },
      _sum: {
        price: true,
        applyPrice: true,
        repaymentFees: true,
        repaymentPrice: true,
        accrualFees: true,
        accumulatedFees: true,
      },
      orderBy: {
        fundGroupAt: 'desc',
      },
    });

    return plainToInstance(
      FutureFundDto,
      result.map((item) => ({
        fundGroupAt: item.fundGroupAt,
        price: item._sum.price + item._sum.repaymentPrice,
        applyPrice: item._sum.applyPrice,
        repaymentFees: item._sum.repaymentFees,
        repaymentPrice: item._sum.repaymentPrice,
        accrualFees: item._sum.accrualFees,
        accumulatedFees: item._sum.accumulatedFees,
      })),
    );
  }

  async apply(
    { userId, date, price }: ApplyFutureFundDto,
    {
      tx,
    }: {
      tx?: Omit<
        PrismaClient,
        | '$connect'
        | '$disconnect'
        | '$on'
        | '$transaction'
        | '$use'
        | '$extends'
      >;
    } = {},
  ): Promise<FutureFund> {
    try {
      return await (tx ? tx : this.prismaService).futureFund.create({
        data: {
          fundGroupAt: date,
          futureFundType: FutureFundType.APPLY,
          applyPrice: price,
          userId,
        },
      });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async calculate(
    userId: number,
    fundGroupAt: string,
  ): Promise<FutureFund | null> {
    const previousDate = dayjs(fundGroupAt)
      .subtract(1, 'day')
      .format('YYYY-MM-DD');
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        futureFundServiceFeeRate: true,
      },
    });

    const exist = await this.prismaService.futureFund.count({
      where: {
        fundGroupAt,
        userId,
        futureFundType: FutureFundType.DAILY,
      },
    });
    if (exist) {
      this.logger.warn(
        `이미 데일리 미래 정산이 존재합니다. userId: ${userId}, fundGroupAt: ${fundGroupAt}`,
      );
      return null;
    }

    const [result] = await this.prismaService.futureFund.groupBy({
      by: ['fundGroupAt', 'userId'],
      where: {
        fundGroupAt: previousDate,
        userId,
      },
      _sum: {
        price: true,
        applyPrice: true,
        accrualFees: true,
        accumulatedFees: true,
        repaymentFees: true,
        repaymentPrice: true,
      },
    });

    if (!result) {
      return null;
    }

    const todayPrice =
      result._sum.price + result._sum.applyPrice + result._sum.repaymentPrice;
    const todayFee = Math.floor(
      todayPrice * user.futureFundServiceFeeRate.toNumber(),
    );
    return this.prismaService.futureFund.create({
      data: {
        fundGroupAt,
        futureFundType: FutureFundType.DAILY,
        userId,
        price: todayPrice,
        accrualFees: todayFee,
        accumulatedFees:
          todayFee + (result._sum.accumulatedFees + result._sum.repaymentFees),
      },
    });
  }

  async repayment(
    userId: number,
    fundGroupAt: string,
    {
      tx,
    }: {
      tx?: Omit<
        PrismaClient,
        | '$connect'
        | '$disconnect'
        | '$on'
        | '$transaction'
        | '$use'
        | '$extends'
      >;
    },
  ): Promise<{ repaymentFees: number; repaymentPrice: number } | null> {
    const [futureFund] = await (tx || this.prismaService).futureFund.groupBy({
      by: ['fundGroupAt', 'userId'],
      where: {
        fundGroupAt,
        userId,
      },
      _sum: {
        price: true,
        accumulatedFees: true,
      },
    });
    // 미래 정산 내역이 없음
    if (!futureFund) {
      return null;
    }

    const prefundByCards = await (
      tx || this.prismaService
    ).prefundByCard.findMany({
      where: {
        prefundGroupAt: fundGroupAt,
        userId,
      },
      select: {
        id: true,
        salesPrice: true,
        serviceCommission: true,
        cardCommission: true,
        setoff: true,
      },
    });
    // 미래 정산 상환할 선정산 내역이 없음
    if (!prefundByCards.length) {
      return null;
    }

    const prefunds = prefundByCards.map((prefundByCard) => ({
      id: prefundByCard.id,
      prefund:
        prefundByCard.salesPrice +
        prefundByCard.cardCommission +
        prefundByCard.serviceCommission +
        prefundByCard.setoff,
    }));

    const repaymentList = [];
    let fee = futureFund._sum.accumulatedFees;
    let price = futureFund._sum.price;
    prefunds.forEach((item) => {
      let prefund = item.prefund;
      let futureFund: Partial<FutureFund> = {
        futureFundType: FutureFundType.REPAYMENT_READY,
        fundGroupAt,
        userId,
        prefundByCardId: item.id,
        repaymentPrice: 0,
        repaymentFees: 0,
      };
      if (prefund <= 0 || fee + price <= 0) {
        return;
      }

      if (fee > 0 && prefund > 0) {
        const repaymentFees = prefund <= fee ? prefund * -1 : fee * -1;
        prefund += repaymentFees;
        fee += repaymentFees;
        futureFund = {
          ...futureFund,
          repaymentFees,
        };
      }

      if (price > 0 && prefund > 0) {
        const repaymentPrice = prefund <= price ? prefund * -1 : price * -1;
        prefund += repaymentPrice;
        price += repaymentPrice;
        futureFund = {
          ...futureFund,
          repaymentPrice,
        };
      }

      repaymentList.push(futureFund);
    });

    await (tx || this.prismaService).futureFund.createMany({
      data: repaymentList,
    });

    return repaymentList.reduce(
      (acc, cur) => ({
        repaymentPrice: acc.repaymentPrice + cur.repaymentPrice,
        repaymentFees: acc.repaymentFees + cur.repaymentFees,
      }),
      { repaymentPrice: 0, repaymentFees: 0 },
    );
  }

  async manualRepayment({
    date,
    repaymentPrice,
    repaymentFees,
    userId,
  }: RepaymentFutureFundDto) {
    try {
      return await this.prismaService.futureFund.create({
        data: {
          fundGroupAt: date,
          futureFundType: FutureFundType.REPAYMENT,
          repaymentFees: repaymentFees * -1,
          repaymentPrice: repaymentPrice * -1,
          userId,
        },
      });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
