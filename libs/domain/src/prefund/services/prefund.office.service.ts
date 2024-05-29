import {
  PrefundDto,
  PrefundListFilterType,
  PrefundStatusEnum,
  SummaryPrefundDto,
} from '@app/domain/prefund';
import { PrefundMatrixSummaryDto } from '@app/domain/prefund/dtos/prefund-matrix-summary.dto';
import { exposeCardCompanyName, exposePrefundStatus, number } from '@app/utils';
import { PrismaService } from '@app/utils/prisma';

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FutureFundType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import * as dayjs from 'dayjs';

@Injectable()
export class PrefundOfficeService {
  constructor(private prismaService: PrismaService) {}

  async matrixSummary(): Promise<PrefundMatrixSummaryDto> {
    // 누전 전체 건
    const allCount = await this.prismaService.prefundByCard.count();

    // 누적 완료된 거래 완료
    const doneCount = await this.prismaService.prefundByCard.count({
      where: {
        status: PrefundStatusEnum.DONE,
      },
    });
    const list = await this.prismaService.prefundByCard.groupBy({
      by: ['status'],
      _sum: {
        salesPrice: true,
        cardCommission: true,
        serviceCommission: true,
        setoff: true,
      },
    });

    // 누적 전체 선정산 지급 금액
    const totalPrefundAmount = list.reduce(
      (acc, item) =>
        acc +
        (item._sum.salesPrice +
          item._sum.cardCommission +
          item._sum.serviceCommission +
          item._sum.setoff),
      0,
    );

    // 누적 완료된 회수 금액
    const totalReturnAmount = list
      .filter((item) => item.status === PrefundStatusEnum.DONE)
      .reduce(
        (acc, item) =>
          acc +
          (item._sum.salesPrice + item._sum.cardCommission + item._sum.setoff),
        0,
      );

    // 누적 완료 수익금
    const totalProfit = list
      .filter((item) => item.status === PrefundStatusEnum.DONE)
      .reduce((acc, item) => acc + item._sum.serviceCommission, 0);

    // 완료한 누적 선정산 지급 금액
    const totalDonePrefundAmount = list
      .filter((item) => item.status === PrefundStatusEnum.DONE)
      .reduce(
        (acc, item) =>
          acc +
          (item._sum.salesPrice +
            item._sum.cardCommission +
            item._sum.serviceCommission +
            item._sum.setoff),
        0,
      );

    /* 평균 완료된 건 회수율 */
    const doneList = await this.prismaService.prefundByCard.findMany({
      where: {
        status: PrefundStatusEnum.DONE,
        depositAt: {
          not: null,
        },
        prefundAt: {
          not: null,
        },
      },
      select: {
        prefundAt: true,
        depositAt: true,
      },
    });
    const sumOffReturnDate = doneList.reduce(
      (acc, item) =>
        acc +
        Math.abs(dayjs(item.depositAt).diff(dayjs(item.prefundAt), 'day')),
      0,
    );
    /* 평균 완료된 건 회수율 */

    return plainToInstance(PrefundMatrixSummaryDto, {
      totalDoneCount: doneCount,
      totalPrefundAmount,
      totalReturnAmount,
      totalProfit: Math.abs(totalProfit),
      returnRate: ((doneCount / allCount || 0) * 100).toFixed(2),
      avgReturnDate: (sumOffReturnDate / doneList.length || 0).toFixed(1),
      avgProfitRate: (
        (Math.abs(totalProfit) / totalDonePrefundAmount || 0) * 100
      ).toFixed(2),
    });
  }

  async list({
    status,
    userId,
    startAt,
    endAt,
  }: PrefundListFilterType): Promise<PrefundDto[]> {
    const list = await this.prismaService.prefundByCard.findMany({
      where: {
        status,
        ...(userId && {
          userId,
        }),
        ...(status === PrefundStatusEnum.READY &&
          startAt &&
          endAt && {
            prefundGroupAt: {
              gte: startAt,
              lte: endAt,
            },
          }),
        ...(status !== PrefundStatusEnum.READY &&
          startAt &&
          endAt && {
            cardSettlementGroupAt: {
              gte: startAt,
              lte: endAt,
            },
          }),
        User: {
          NOT: {
            name: {
              startsWith: '조회_',
            },
          },
        },
      },
      include: {
        User: {
          select: {
            name: true,
          },
        },
        FutureFund: {
          select: {
            id: true,
            repaymentFees: true,
            repaymentPrice: true,
          },
        },
      },
      orderBy: [
        {
          salesGroupAt: 'desc',
        },
        {
          cardCompanyName: 'desc',
        },
      ],
    });

    return plainToInstance(
      PrefundDto,
      list.map(({ FutureFund, ...leftover }) => ({
        ...leftover,
        cardCompanyName: exposeCardCompanyName(leftover.cardCompanyName),
        status: exposePrefundStatus(leftover.status),
        repaymentFees: FutureFund.reduce(
          (acc, cur) => acc + cur.repaymentFees,
          0,
        ),
        repaymentPrice: FutureFund.reduce(
          (acc, cur) => acc + cur.repaymentPrice,
          0,
        ),
        prefundPrice:
          leftover.salesPrice +
          leftover.cardCommission +
          leftover.serviceCommission +
          leftover.setoff,
        depositPrice:
          leftover.salesPrice +
          leftover.cardCommission +
          leftover.serviceCommission +
          leftover.setoff +
          FutureFund.reduce((acc, cur) => acc + cur.repaymentPrice, 0) +
          FutureFund.reduce((acc, cur) => acc + cur.repaymentFees, 0),
        cardSettlementPrice:
          leftover.salesPrice + leftover.cardCommission + leftover.setoff,
        name: leftover.User.name,
      })),
    );
  }

  async updatePrefundStatusByIds(
    ids: number[],
    status: PrefundStatusEnum,
  ): Promise<boolean> {
    try {
      const prefundAt =
        status === PrefundStatusEnum.DEPOSIT_DONE
          ? dayjs().add(9, 'h').format('YYYY-MM-DD HH:mm:ss')
          : null;
      const depositAt =
        status === PrefundStatusEnum.DONE
          ? dayjs().add(9, 'h').format('YYYY-MM-DD HH:mm:ss')
          : null;
      await this.prismaService.prefundByCard.updateMany({
        where: {
          id: {
            in: ids,
          },
        },
        data: {
          status,
          ...(status === PrefundStatusEnum.DEPOSIT_DONE && { prefundAt }),
          ...(status === PrefundStatusEnum.DONE && { depositAt }),
        },
      });

      if (status === PrefundStatusEnum.DEPOSIT_DONE) {
        await this.prismaService.futureFund.updateMany({
          where: {
            prefundByCardId: {
              in: ids,
            },
            futureFundType: FutureFundType.REPAYMENT_READY,
          },
          data: {
            futureFundType: FutureFundType.REPAYMENT,
          },
        });
      }

      return true;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async summary(date: string, userId: number): Promise<SummaryPrefundDto> {
    const [prefundInfo] = await this.prismaService.prefundByCard.groupBy({
      by: ['userId'],
      where: {
        prefundGroupAt: date,
        userId,
      },
      _sum: {
        salesPrice: true,
        cardCommission: true,
        serviceCommission: true,
        setoff: true,
      },
    });
    const [futureFundInfo] = await this.prismaService.futureFund.groupBy({
      by: ['userId'],
      where: {
        fundGroupAt: date,
        userId,
      },
      _sum: {
        repaymentFees: true,
        repaymentPrice: true,
      },
    });

    return plainToInstance(SummaryPrefundDto, {
      salesPrice: number(prefundInfo?._sum.salesPrice),
      cardCommission: number(prefundInfo?._sum.cardCommission),
      serviceCommission: number(prefundInfo?._sum.serviceCommission),
      setoff: number(prefundInfo?._sum.setoff),
      prefundPrice:
        number(prefundInfo?._sum.salesPrice) +
        number(prefundInfo?._sum.cardCommission) +
        number(prefundInfo?._sum.serviceCommission) +
        number(prefundInfo?._sum.setoff),
      repaymentFees: number(futureFundInfo?._sum.repaymentFees),
      repaymentPrice: number(futureFundInfo?._sum.repaymentPrice),
      depositPrice:
        number(prefundInfo?._sum.salesPrice) +
          number(prefundInfo?._sum.cardCommission) +
          number(prefundInfo?._sum.serviceCommission) +
          number(prefundInfo?._sum.setoff) +
          number(futureFundInfo?._sum.repaymentFees) +
          number(futureFundInfo?._sum.repaymentPrice) || 0,
    });
  }
}
