import {
  PrefundListFilterType,
  SearchDetailItemDto,
  SearchDetailItemDto2,
  SearchPrefundDto,
  TodayPreFundDto,
  TodayPreFundSummaryDto,
} from '@app/domain/prefund';
import { exposeCardCompanyName, exposePrefundStatus, number } from '@app/utils';
import { PrismaService } from '@app/utils/prisma';

import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import * as _ from 'lodash';

function makeDateRange(
  startAt: string,
  endAt: string,
): { YYYYMMDD: string; MMDD: string }[] {
  let currentDate = dayjs(startAt, 'YYYY-MM-DD').hour(0).minute(0).second(0);
  const dateRange = [];
  while (currentDate.isBefore(endAt) || currentDate.isSame(endAt)) {
    dateRange.push({
      YYYYMMDD: currentDate.format('YYYY-MM-DD'),
      MMDD: currentDate.format('MM.DD'),
    });
    currentDate = currentDate.add(1, 'd');
  }
  return dateRange;
}

@Injectable()
export class PrefundService {
  constructor(private prismaService: PrismaService) {}

  async today(
    userId: number,
    prefundGroupAt: string,
  ): Promise<TodayPreFundSummaryDto> {
    // 한국 시간 기준으로 날짜를 구해야하므로
    const [result] = await this.prismaService.prefundByCard.groupBy({
      by: ['prefundGroupAt', 'userId'],
      where: {
        prefundGroupAt,
        userId,
      },
      _sum: {
        salesPrice: true,
        cardCommission: true,
        serviceCommission: true,
        setoff: true,
      },
    });
    const prefundDateList = await this.prismaService.prefundByCard.findMany({
      where: {
        prefundGroupAt,
        userId,
      },
      select: {
        prefundGroupAt: true,
        cardSettlementGroupAt: true,
      },
    });
    const totalPrefundDate = prefundDateList.reduce(
      (acc, cur) =>
        acc +
        dayjs(cur.cardSettlementGroupAt).diff(dayjs(cur.prefundGroupAt), 'day'),
      0,
    );

    return {
      prefund:
        result?._sum.salesPrice +
          result?._sum.serviceCommission +
          result?._sum.cardCommission +
          result?._sum.setoff || 0,
      serviceCommission: result?._sum.serviceCommission || 0,
      setoff: result?._sum.setoff || 0,
      preSalesPrice: result?._sum.salesPrice || 0,
      preCardCommission: result?._sum.cardCommission || 0,
      prefundAvgDate: prefundDateList.length
        ? totalPrefundDate / prefundDateList.length
        : 0,
    };
  }

  async todayDetails(
    userId: number,
    prefundGroupAt: string,
  ): Promise<TodayPreFundDto[]> {
    // 상세
    const details = await this.prismaService.prefundByCard.findMany({
      where: {
        prefundGroupAt,
        userId,
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

    let currentSalesGroupAt = null;
    let rowSpanForSalesGroupAt = 0;
    return [
      ...details.map((current, index) => {
        if (current.salesGroupAt !== currentSalesGroupAt) {
          currentSalesGroupAt = current.salesGroupAt;
          rowSpanForSalesGroupAt = details.filter(
            (record) => record.salesGroupAt === current.salesGroupAt,
          ).length;
        } else {
          rowSpanForSalesGroupAt = 0;
        }

        const itemSummary = {
          prefund:
            current.salesPrice +
            current.serviceCommission +
            current.cardCommission,
          serviceCommission: current.serviceCommission,
          setoff: current.setoff,
          preSalesPrice: current.salesPrice,
          preCardCommission: current.cardCommission,
        };

        return {
          date: prefundGroupAt,
          salesGroupAt: current.salesGroupAt,
          cardCompanyName: exposeCardCompanyName(current.cardCompanyName),
          preFundPrice: itemSummary.prefund,
          status: exposePrefundStatus(current.status),
          rowSpan: index === 0 ? details.length + 1 : 0,
          rowSpanForSalesGroupAt,
          preFundDate: current.prefundAt,
          preSalesPrice: itemSummary.preSalesPrice,
          preCardCommission: itemSummary.preCardCommission,
          serviceCommission: itemSummary.serviceCommission,
          setoff: itemSummary.setoff,
          prefundAvgDate: dayjs(current.cardSettlementGroupAt).diff(
            dayjs(prefundGroupAt),
            'day',
          ),
        };
      }),
    ];
  }

  async search({
    startAt,
    userId,
    endAt,
  }: PrefundListFilterType): Promise<SearchPrefundDto> {
    const listSales = await this.prismaService.prefundByCard.groupBy({
      by: ['prefundGroupAt', 'userId'],
      where: {
        prefundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
        userId,
      },
      _sum: {
        salesPrice: true,
        cardCommission: true,
        serviceCommission: true,
        setoff: true,
      },
    });

    const futureFund = await this.prismaService.futureFund.groupBy({
      by: ['fundGroupAt', 'userId'],
      where: {
        fundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
        userId,
      },
      _sum: {
        repaymentPrice: true,
        repaymentFees: true,
      },
    });

    const dateRange = makeDateRange(startAt, endAt);
    const listObj = listSales.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.prefundGroupAt]: cur,
      }),
      {},
    );
    const futureFundObj = futureFund.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.fundGroupAt]: cur,
      }),
      {},
    );

    return {
      dates: dateRange.map((item) => item.MMDD),
      data: [
        {
          name: 'setoff',
          values: dateRange.map((item) => {
            return listObj[item.YYYYMMDD]
              ? listObj[item.YYYYMMDD]._sum.setoff
              : 0;
          }),
        },
        {
          name: 'serviceCommission',
          values: dateRange.map((item) => {
            return listObj[item.YYYYMMDD]
              ? listObj[item.YYYYMMDD]._sum.serviceCommission
              : 0;
          }),
        },
        {
          name: 'cardCommission',
          values: dateRange.map((item) => {
            return listObj[item.YYYYMMDD]
              ? listObj[item.YYYYMMDD]._sum.cardCommission
              : 0;
          }),
        },
        {
          name: 'salesPrice',
          values: dateRange.map((item) => {
            return listObj[item.YYYYMMDD]
              ? listObj[item.YYYYMMDD]._sum.salesPrice
              : 0;
          }),
        },
        {
          name: 'repaymentPrice',
          values: dateRange.map((item) => {
            return futureFundObj[item.YYYYMMDD]
              ? futureFundObj[item.YYYYMMDD]._sum.repaymentPrice
              : 0;
          }),
        },
        {
          name: 'repaymentFees',
          values: dateRange.map((item) => {
            return futureFundObj[item.YYYYMMDD]
              ? futureFundObj[item.YYYYMMDD]._sum.repaymentFees
              : 0;
          }),
        },
      ],
    };
  }

  async searchDetails({
    endAt,
    startAt,
    userId,
  }: PrefundListFilterType): Promise<SearchDetailItemDto[]> {
    // 요약
    const summaryList = await this.prismaService.prefundByCard.groupBy({
      by: ['prefundGroupAt', 'userId'],
      where: {
        prefundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
        userId,
      },
      _sum: {
        salesPrice: true,
        cardCommission: true,
        serviceCommission: true,
        setoff: true,
      },
      orderBy: [
        {
          prefundGroupAt: 'desc',
        },
      ],
    });

    // 카드사별 상세
    const details = await this.prismaService.prefundByCard.findMany({
      where: {
        prefundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
        userId,
      },
      orderBy: [
        {
          prefundGroupAt: 'desc',
        },
        {
          salesGroupAt: 'desc',
        },
        {
          cardCompanyName: 'desc',
        },
      ],
    });

    return [
      ...summaryList.map((summary, index) => {
        const children = details.filter(
          (i) => i.prefundGroupAt === summary.prefundGroupAt,
        );

        const itemSummary = {
          prefund:
            summary._sum.salesPrice +
            summary._sum.serviceCommission +
            summary._sum.cardCommission,
          serviceCommission: summary._sum.serviceCommission,
          setoff: summary._sum.setoff,
          preSalesPrice: summary._sum.salesPrice,
          preCardCommission: summary._sum.cardCommission,
        };

        let currentSalesGroupAt = null;
        let rowSpanForSalesGroupAt = 0;
        return {
          key: index,
          date: summary.prefundGroupAt,
          cardCompanyName: '전체',
          rowSpan: children.length + 1,
          preFundPrice: itemSummary.prefund,
          status: '-',
          salesGroupAt: '-',
          preFundDate: null,
          approvalAmount: itemSummary.preSalesPrice,
          commission: itemSummary.preCardCommission,
          serviceCommission: itemSummary.serviceCommission,
          setoff: itemSummary.setoff,
          children: children.map((child) => {
            if (child.salesGroupAt !== currentSalesGroupAt) {
              currentSalesGroupAt = child.salesGroupAt;
              rowSpanForSalesGroupAt = children.filter(
                (record) => record.salesGroupAt === child.salesGroupAt,
              ).length;
            } else {
              rowSpanForSalesGroupAt = 0;
            }

            const childSummary = {
              prefund:
                child.salesPrice +
                child.cardCommission +
                child.serviceCommission +
                child.setoff,
              serviceCommission: child.serviceCommission,
              setoff: child.setoff,
              preSalesPrice: child.salesPrice,
              preCardCommission: child.cardCommission,
            };

            return {
              date: child.prefundGroupAt,
              salesGroupAt: child.salesGroupAt,
              rowSpanForSalesGroupAt,
              cardCompanyName: exposeCardCompanyName(child.cardCompanyName),
              preFundPrice: childSummary.prefund,
              status: exposePrefundStatus(child.status),
              preFundDate: child.prefundAt,
              approvalAmount: childSummary.preSalesPrice,
              commission: childSummary.preCardCommission,
              serviceCommission: childSummary.serviceCommission,
              setoff: childSummary.setoff,
            };
          }),
        };
      }),
    ];
  }

  async searchDetails2({
    endAt,
    startAt,
    userId,
  }: PrefundListFilterType): Promise<SearchDetailItemDto2[]> {
    const prefundInfo = await this.prismaService.prefundByCard.groupBy({
      by: ['prefundGroupAt', 'userId'],
      where: {
        prefundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
        userId,
      },
      _sum: {
        salesPrice: true,
        cardCommission: true,
        serviceCommission: true,
        setoff: true,
      },
      orderBy: [
        {
          prefundGroupAt: 'desc',
        },
      ],
    });
    const futureFundInfo = await this.prismaService.futureFund.groupBy({
      by: ['fundGroupAt', 'userId'],
      where: {
        fundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
        userId,
      },
      _sum: {
        price: true,
        applyPrice: true,
        repaymentFees: true,
        repaymentPrice: true,
      },
      orderBy: [
        {
          fundGroupAt: 'desc',
        },
      ],
    });
    return _.compact(
      _.reverse(makeDateRange(startAt, endAt)).map((date) => {
        const prefund = prefundInfo.find(
          (p) => p.prefundGroupAt === date.YYYYMMDD,
        );
        const futureFund = futureFundInfo.find(
          (f) => f.fundGroupAt === date.YYYYMMDD,
        );
        if (!prefund && !futureFund) {
          return null;
        }

        const prefundPrice =
          number(prefund?._sum.salesPrice) +
          number(prefund?._sum.cardCommission) +
          number(prefund?._sum.serviceCommission) +
          number(prefund?._sum.setoff);
        const repayment =
          number(futureFund?._sum.repaymentPrice) +
          number(futureFund?._sum.repaymentFees);
        return {
          prefundGroupAt: date.YYYYMMDD,
          salesPrice: number(prefund?._sum.salesPrice),
          cardCommission: number(prefund?._sum.cardCommission),
          serviceCommission: number(prefund?._sum.serviceCommission),
          setoff: number(prefund?._sum.setoff),
          prefundPrice,
          repaymentFees: number(futureFund?._sum.repaymentFees),
          repaymentPrice: number(futureFund?._sum.repaymentPrice),
          depositPrice: prefundPrice + repayment,
          applyFutureFund: number(futureFund?._sum.applyPrice),
          futureFund:
            number(futureFund?._sum.price) +
            number(futureFund?._sum.repaymentPrice),
        };
      }),
    );
  }
}
