import { HomeChartDto } from '@app/apps/office/src/home/dtos';
import { ChartDataType } from '@app/apps/office/src/home/home.controller';
import { PrismaService } from '@app/utils/prisma';

import { Injectable } from '@nestjs/common';
import { PrefundStatus } from '@prisma/client';
import * as dayjs from 'dayjs';
import * as weekOfYear from 'dayjs/plugin/weekOfYear';
import { groupBy, sumBy, uniq, uniqBy } from 'lodash';

dayjs.extend(weekOfYear);

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

function makeDateRangeWeekly(startAt: string, endAt: string): number[] {
  let currentDate = dayjs(startAt, 'YYYY-MM-DD').hour(0).minute(0).second(0);
  const dateRange = [];
  while (currentDate.isBefore(endAt) || currentDate.isSame(endAt)) {
    dateRange.push(currentDate.week());
    currentDate = currentDate.add(1, 'd');
  }

  return uniq(dateRange);
}

function monthToStr(date: dayjs.Dayjs) {
  return `${date.year()}.${date.month() + 1}`;
}

function makeDateRangeMonthly(startAt: string, endAt: string): string[] {
  let currentDate = dayjs(startAt, 'YYYY-MM-DD').hour(0).minute(0).second(0);
  const dateRange = [];
  while (currentDate.isBefore(endAt) || currentDate.isSame(endAt)) {
    dateRange.push(monthToStr(currentDate));
    currentDate = currentDate.add(1, 'd');
  }

  return uniq(dateRange);
}

@Injectable()
export class ChartService {
  constructor(private prismaService: PrismaService) {}

  async activeUser(
    dateType: ChartDataType,
    startAt: string,
    endAt: string,
  ): Promise<HomeChartDto> {
    const prefund = await this.prismaService.prefundByCard.groupBy({
      by: ['prefundGroupAt', 'userId'],
      where: {
        status: {
          in: [PrefundStatus.DEPOSIT_DONE, PrefundStatus.DONE],
        },
        prefundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
      },
      _count: {
        userId: true,
      },
      orderBy: {
        prefundGroupAt: 'asc',
      },
    });

    const futureFund = await this.prismaService.futureFund.groupBy({
      by: ['fundGroupAt', 'userId'],
      where: {
        PrefundByCard: {
          status: {
            in: [PrefundStatus.DEPOSIT_DONE, PrefundStatus.DONE],
          },
        },
        fundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
      },
      _count: {
        userId: true,
      },
      orderBy: {
        fundGroupAt: 'asc',
      },
    });

    if (dateType === 'DAILY') {
      const dateRanges = makeDateRange(startAt, endAt).map(
        (item) => item.YYYYMMDD,
      );

      return {
        xAxis: dateRanges,
        legend: ['선정산 이용 수', '미래정산 이용 수', '합계'],
        series: [
          {
            name: '선정산 이용 수',
            type: 'line',
            stack: 'prefund',
            data: dateRanges.map((date) => {
              const exist = prefund.filter(
                (item) => item.prefundGroupAt === date,
              );
              const count = uniqBy(exist, 'userId').length || 0;
              return count || 0;
            }),
          },
          {
            name: '미래정산 이용 수',
            type: 'line',
            stack: 'futureFund',
            data: dateRanges.map((date) => {
              const exist = futureFund.filter(
                (item) => item.fundGroupAt === date,
              );
              const count = uniqBy(exist, 'userId').length || 0;
              return count || 0;
            }),
          },
          {
            name: '합계',
            type: 'line',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const fExist = futureFund.filter(
                (item) => item.fundGroupAt === date,
              );
              const exist = prefund.filter(
                (item) => item.prefundGroupAt === date,
              );
              return uniqBy([...fExist, ...exist], 'userId').length || 0;
            }),
          },
        ],
      };
    } else if (dateType === 'WEEKLY') {
      const dateRanges = makeDateRangeWeekly(startAt, endAt);
      return {
        xAxis: dateRanges.map((week) => `${week}주차`),
        legend: ['선정산 이용 수', '미래정산 이용 수', '합계'],
        series: [
          {
            name: '선정산 이용 수',
            type: 'line',
            stack: 'prefund',
            data: dateRanges.map((date) => {
              const exist = prefund.filter(
                (item) => dayjs(item.prefundGroupAt).week() === date,
              );
              const count = uniqBy(exist, 'userId').length || 0;
              return count || 0;
            }),
          },
          {
            name: '미래정산 이용 수',
            type: 'line',
            stack: 'futureFund',
            data: dateRanges.map((date) => {
              const exist = futureFund.filter(
                (item) => dayjs(item.fundGroupAt).week() === date,
              );
              const count = uniqBy(exist, 'userId').length || 0;
              return count || 0;
            }),
          },
          {
            name: '합계',
            type: 'line',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const fExist = futureFund.filter(
                (item) => dayjs(item.fundGroupAt).week() === date,
              );
              const exist = prefund.filter(
                (item) => dayjs(item.prefundGroupAt).week() === date,
              );
              return uniqBy([...fExist, ...exist], 'userId').length || 0;
            }),
          },
        ],
      };
    } else if (dateType === 'MONTHLY') {
      const dateRanges = makeDateRangeMonthly(startAt, endAt);
      return {
        xAxis: dateRanges,
        legend: ['선정산 이용 수', '미래정산 이용 수', '합계'],
        series: [
          {
            name: '선정산 이용 수',
            type: 'line',
            stack: 'prefund',
            data: dateRanges.map((date) => {
              const exist = prefund.filter(
                (item) => monthToStr(dayjs(item.prefundGroupAt)) === date,
              );
              const count = uniqBy(exist, 'userId').length || 0;
              return count || 0;
            }),
          },
          {
            name: '미래정산 이용 수',
            type: 'line',
            stack: 'futureFund',
            data: dateRanges.map((date) => {
              const exist = futureFund.filter(
                (item) => monthToStr(dayjs(item.fundGroupAt)) === date,
              );
              const count = uniqBy(exist, 'userId').length || 0;
              return count || 0;
            }),
          },
          {
            name: '합계',
            type: 'line',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const fExist = futureFund.filter(
                (item) => monthToStr(dayjs(item.fundGroupAt)) === date,
              );
              const exist = prefund.filter(
                (item) => monthToStr(dayjs(item.prefundGroupAt)) === date,
              );
              return uniqBy([...fExist, ...exist], 'userId').length || 0;
            }),
          },
        ],
      };
    }

    return {
      xAxis: [],
      legend: [],
      series: [],
    };
  }

  async profit(
    dateType: ChartDataType,
    startAt: string,
    endAt: string,
  ): Promise<HomeChartDto> {
    const prefund = await this.prismaService.prefundByCard.groupBy({
      by: ['depositAt'],
      where: {
        status: PrefundStatus.DONE,
        depositAt: {
          gte: startAt,
          lte: endAt,
        },
      },
      _sum: {
        serviceCommission: true,
      },
      orderBy: {
        depositAt: 'asc',
      },
    });

    const futureFund = await this.prismaService.futureFund.groupBy({
      by: ['fundGroupAt'],
      where: {
        fundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
      },
      _sum: {
        repaymentFees: true,
      },
      orderBy: {
        fundGroupAt: 'asc',
      },
    });

    if (dateType === 'DAILY') {
      const dateRanges = makeDateRange(startAt, endAt).map(
        (item) => item.YYYYMMDD,
      );

      return {
        xAxis: dateRanges,
        legend: ['선정산 수수료', '미래정산 수수료', '합계'],
        series: [
          {
            name: '선정산 수수료',
            type: 'line',
            stack: 'prefund',
            data: dateRanges.map((date) => {
              const exist = prefund.find(
                (item) => dayjs(item.depositAt).format('YYYY-MM-DD') === date,
              );
              return exist ? Math.abs(exist._sum.serviceCommission) : 0;
            }),
          },
          {
            name: '미래정산 수수료',
            type: 'line',
            stack: 'futureFund',
            data: dateRanges.map((date) => {
              const exist = futureFund.find(
                (item) => item.fundGroupAt === date,
              );
              return exist ? Math.abs(exist._sum.repaymentFees) : 0;
            }),
          },
          {
            name: '합계',
            type: 'line',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const fExist = futureFund.find(
                (item) => item.fundGroupAt === date,
              );
              const pExist = prefund.find(
                (item) => dayjs(item.depositAt).format('YYYY-MM-DD') === date,
              );
              return (
                Math.abs(fExist?._sum.repaymentFees ?? 0) +
                Math.abs(pExist?._sum.serviceCommission ?? 0)
              );
            }),
          },
        ],
      };
    } else if (dateType === 'WEEKLY') {
      const dateRanges = makeDateRangeWeekly(startAt, endAt);
      return {
        xAxis: dateRanges.map((week) => `${week}주차`),
        legend: ['선정산 수수료', '미래정산 수수료', '합계'],
        series: [
          {
            name: '선정산 수수료',
            type: 'line',
            stack: 'prefund',
            data: dateRanges.map((date) => {
              const exist = prefund.filter(
                (item) => dayjs(item.depositAt).week() === date,
              );
              return sumBy(exist, (item) =>
                Math.abs(item._sum.serviceCommission),
              );
            }),
          },
          {
            name: '미래정산 수수료',
            type: 'line',
            stack: 'futureFund',
            data: dateRanges.map((date) => {
              const exist = futureFund.filter(
                (item) => dayjs(item.fundGroupAt).week() === date,
              );
              return sumBy(exist, (item) => Math.abs(item._sum.repaymentFees));
            }),
          },
          {
            name: '합계',
            type: 'line',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const fExist = futureFund.filter(
                (item) => dayjs(item.fundGroupAt).week() === date,
              );
              const pExist = prefund.filter(
                (item) => dayjs(item.depositAt).week() === date,
              );
              return (
                sumBy(pExist, (item) => Math.abs(item._sum.serviceCommission)) +
                sumBy(fExist, (item) => Math.abs(item._sum.repaymentFees))
              );
            }),
          },
        ],
      };
    } else if (dateType === 'MONTHLY') {
      const dateRanges = makeDateRangeMonthly(startAt, endAt);
      return {
        xAxis: dateRanges,
        legend: ['선정산 수수료', '미래정산 수수료', '합계'],
        series: [
          {
            name: '선정산 수수료',
            type: 'line',
            stack: 'prefund',
            data: dateRanges.map((date) => {
              const exist = prefund.filter(
                (item) => monthToStr(dayjs(item.depositAt)) === date,
              );
              return sumBy(exist, (item) =>
                Math.abs(item._sum.serviceCommission),
              );
            }),
          },
          {
            name: '미래정산 수수료',
            type: 'line',
            stack: 'futureFund',
            data: dateRanges.map((date) => {
              const exist = futureFund.filter(
                (item) => monthToStr(dayjs(item.fundGroupAt)) === date,
              );
              return sumBy(exist, (item) => Math.abs(item._sum.repaymentFees));
            }),
          },
          {
            name: '합계',
            type: 'line',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const fExist = futureFund.filter(
                (item) => monthToStr(dayjs(item.fundGroupAt)) === date,
              );
              const pExist = prefund.filter(
                (item) => monthToStr(dayjs(item.depositAt)) === date,
              );
              return (
                sumBy(pExist, (item) => Math.abs(item._sum.serviceCommission)) +
                sumBy(fExist, (item) => Math.abs(item._sum.repaymentFees))
              );
            }),
          },
        ],
      };
    }

    return {
      xAxis: [],
      legend: [],
      series: [],
    };
  }

  async prefund(
    dateType: ChartDataType,
    startAt: string,
    endAt: string,
  ): Promise<HomeChartDto> {
    const prefund = await this.prismaService.prefundByCard.groupBy({
      by: ['prefundGroupAt', 'userId'],
      where: {
        status: {
          in: [PrefundStatus.DONE, PrefundStatus.DEPOSIT_DONE],
        },
        prefundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
      },
      _sum: {
        salesPrice: true,
        cardCommission: true,
        serviceCommission: true,
        setoff: true,
      },
      orderBy: {
        prefundGroupAt: 'asc',
      },
    });
    const user = await this.prismaService.user.findMany();

    const groupByUserId = groupBy(prefund, (item) => item.userId);
    const nameList = Object.keys(groupByUserId).map(
      (userId) => user.find((u) => u.id === Number(userId))?.name,
    );

    if (dateType === 'DAILY') {
      const dateRanges = makeDateRange(startAt, endAt).map(
        (item) => item.YYYYMMDD,
      );
      return {
        xAxis: dateRanges,
        legend: [...nameList, '합계'],
        series: [
          ...Object.keys(groupByUserId).map((userId) => ({
            name: user.find((u) => u.id === Number(userId))?.name,
            type: 'line',
            stack: userId,
            data: dateRanges.map((date) => {
              const result = groupByUserId[userId].find(
                (item) => item.prefundGroupAt === date,
              );
              return result
                ? result._sum.salesPrice +
                    result._sum.cardCommission +
                    result._sum.serviceCommission +
                    result._sum.setoff
                : 0;
            }),
          })),
          {
            name: '합계',
            type: 'line',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const result = prefund.filter(
                (item) => item.prefundGroupAt === date,
              );
              return sumBy(
                result,
                (item) =>
                  item._sum.salesPrice +
                  item._sum.cardCommission +
                  item._sum.serviceCommission +
                  item._sum.setoff,
              );
            }),
          },
        ],
      };
    } else if (dateType === 'WEEKLY') {
      const dateRanges = makeDateRangeWeekly(startAt, endAt);
      return {
        xAxis: dateRanges.map((week) => `${week}주차`),
        legend: [...nameList, '합계'],
        series: [
          ...Object.keys(groupByUserId).map((userId) => ({
            name: user.find((u) => u.id === Number(userId))?.name,
            type: 'line',
            stack: userId,
            data: dateRanges.map((date) => {
              const result = groupByUserId[userId].filter(
                (item) => dayjs(item.prefundGroupAt).week() === date,
              );
              return sumBy(
                result,
                (item) =>
                  item._sum.salesPrice +
                  item._sum.cardCommission +
                  item._sum.serviceCommission +
                  item._sum.setoff,
              );
            }),
          })),
          {
            name: '합계',
            type: 'line',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const result = prefund.filter(
                (item) => dayjs(item.prefundGroupAt).week() === date,
              );
              return sumBy(
                result,
                (item) =>
                  item._sum.salesPrice +
                  item._sum.cardCommission +
                  item._sum.serviceCommission +
                  item._sum.setoff,
              );
            }),
          },
        ],
      };
    } else if (dateType === 'MONTHLY') {
      const dateRanges = makeDateRangeMonthly(startAt, endAt);
      return {
        xAxis: dateRanges,
        legend: [...nameList, '합계'],
        series: [
          ...Object.keys(groupByUserId).map((userId) => ({
            name: user.find((u) => u.id === Number(userId))?.name,
            type: 'line',
            stack: userId,
            data: dateRanges.map((date) => {
              const result = groupByUserId[userId].filter(
                (item) => monthToStr(dayjs(item.prefundGroupAt)) === date,
              );
              return sumBy(
                result,
                (item) =>
                  item._sum.salesPrice +
                  item._sum.cardCommission +
                  item._sum.serviceCommission +
                  item._sum.setoff,
              );
            }),
          })),
          {
            name: '합계',
            type: 'line',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const result = prefund.filter(
                (item) => monthToStr(dayjs(item.prefundGroupAt)) === date,
              );
              return sumBy(
                result,
                (item) =>
                  item._sum.salesPrice +
                  item._sum.cardCommission +
                  item._sum.serviceCommission +
                  item._sum.setoff,
              );
            }),
          },
        ],
      };
    }

    return {
      xAxis: [],
      legend: [],
      series: [],
    };
  }

  async futureFund(
    dateType: ChartDataType,
    startAt: string,
    endAt: string,
  ): Promise<HomeChartDto> {
    const futureFund = await this.prismaService.futureFund.groupBy({
      by: ['fundGroupAt', 'userId'],
      where: {
        fundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
      },
      _sum: {
        applyPrice: true,
      },
      orderBy: {
        fundGroupAt: 'asc',
      },
    });
    const user = await this.prismaService.user.findMany();

    const groupByUserId = groupBy(futureFund, (item) => item.userId);
    const nameList = Object.keys(groupByUserId).map(
      (userId) => user.find((u) => u.id === Number(userId))?.name,
    );

    if (dateType === 'DAILY') {
      const dateRanges = makeDateRange(startAt, endAt).map(
        (item) => item.YYYYMMDD,
      );
      return {
        xAxis: dateRanges,
        legend: [...nameList, '합계'],
        series: [
          ...Object.keys(groupByUserId).map((userId) => ({
            name: user.find((u) => u.id === Number(userId))?.name,
            type: 'line',
            stack: userId,
            data: dateRanges.map((date) => {
              const result = groupByUserId[userId].find(
                (item) => item.fundGroupAt === date,
              );
              return result ? result._sum.applyPrice : 0;
            }),
          })),
          {
            name: '합계',
            type: 'line',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const result = futureFund.filter(
                (item) => item.fundGroupAt === date,
              );
              return sumBy(result, (item) => item._sum.applyPrice);
            }),
          },
        ],
      };
    } else if (dateType === 'WEEKLY') {
      const dateRanges = makeDateRangeWeekly(startAt, endAt);
      return {
        xAxis: dateRanges.map((week) => `${week}주차`),
        legend: [...nameList, '합계'],
        series: [
          ...Object.keys(groupByUserId).map((userId) => ({
            name: user.find((u) => u.id === Number(userId))?.name,
            type: 'line',
            stack: userId,
            data: dateRanges.map((date) => {
              const result = groupByUserId[userId].filter(
                (item) => dayjs(item.fundGroupAt).week() === date,
              );
              return sumBy(result, (item) => item._sum.applyPrice);
            }),
          })),
          {
            name: '합계',
            type: 'line',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const result = futureFund.filter(
                (item) => dayjs(item.fundGroupAt).week() === date,
              );
              return sumBy(result, (item) => item._sum.applyPrice);
            }),
          },
        ],
      };
    } else if (dateType === 'MONTHLY') {
      const dateRanges = makeDateRangeMonthly(startAt, endAt);
      return {
        xAxis: dateRanges,
        legend: [...nameList, '합계'],
        series: [
          ...Object.keys(groupByUserId).map((userId) => ({
            name: user.find((u) => u.id === Number(userId))?.name,
            type: 'line',
            stack: userId,
            data: dateRanges.map((date) => {
              const result = groupByUserId[userId].filter(
                (item) => monthToStr(dayjs(item.fundGroupAt)) === date,
              );
              return sumBy(result, (item) => item._sum.applyPrice);
            }),
          })),
          {
            name: '합계',
            type: 'line',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const result = futureFund.filter(
                (item) => monthToStr(dayjs(item.fundGroupAt)) === date,
              );
              return sumBy(result, (item) => item._sum.applyPrice);
            }),
          },
        ],
      };
    }

    return {
      xAxis: [],
      legend: [],
      series: [],
    };
  }

  async gmv(
    dateType: ChartDataType,
    startAt: string,
    endAt: string,
  ): Promise<HomeChartDto> {
    const prefund = await this.prismaService.prefundByCard.groupBy({
      by: ['prefundGroupAt'],
      where: {
        status: {
          in: [PrefundStatus.DEPOSIT_DONE, PrefundStatus.DONE],
        },
        prefundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
      },
      _sum: {
        serviceCommission: true,
        setoff: true,
        salesPrice: true,
        cardCommission: true,
      },
      orderBy: {
        prefundGroupAt: 'asc',
      },
    });

    const futureFund = await this.prismaService.futureFund.groupBy({
      by: ['fundGroupAt'],
      where: {
        fundGroupAt: {
          gte: startAt,
          lte: endAt,
        },
      },
      _sum: {
        applyPrice: true,
      },
      orderBy: {
        fundGroupAt: 'asc',
      },
    });

    if (dateType === 'DAILY') {
      const dateRanges = makeDateRange(startAt, endAt).map(
        (item) => item.YYYYMMDD,
      );

      return {
        xAxis: dateRanges,
        legend: ['선정산 금액', '미래정산 금액', '합계'],
        series: [
          {
            name: '선정산 금액',
            type: 'bar',
            stack: 'Prefund',
            data: dateRanges.map((date) => {
              const result = prefund.filter(
                (item) => item.prefundGroupAt === date,
              );
              return sumBy(
                result,
                (item) =>
                  item._sum.salesPrice +
                  item._sum.cardCommission +
                  item._sum.serviceCommission +
                  item._sum.setoff,
              );
            }),
          },
          {
            name: '미래정산 금액',
            type: 'bar',
            stack: 'FutureFund',
            data: dateRanges.map((date) => {
              const result = futureFund.filter(
                (item) => item.fundGroupAt === date,
              );
              return sumBy(result, (item) => item._sum.applyPrice);
            }),
          },
          {
            name: '합계',
            type: 'bar',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const prefundList = prefund.filter(
                (item) => item.prefundGroupAt === date,
              );
              const futureFundList = futureFund.filter(
                (item) => item.fundGroupAt === date,
              );
              return (
                sumBy(futureFundList, (item) => item._sum.applyPrice) +
                sumBy(
                  prefundList,
                  (item) =>
                    item._sum.salesPrice +
                    item._sum.cardCommission +
                    item._sum.serviceCommission +
                    item._sum.setoff,
                )
              );
            }),
          },
        ],
      };
    } else if (dateType === 'WEEKLY') {
      const dateRanges = makeDateRangeWeekly(startAt, endAt);

      return {
        xAxis: dateRanges.map((week) => `${week}주차`),
        legend: ['선정산 금액', '미래정산 금액', '합계'],
        series: [
          {
            name: '선정산 금액',
            type: 'bar',
            stack: 'Prefund',
            data: dateRanges.map((date) => {
              const result = prefund.filter(
                (item) => dayjs(item.prefundGroupAt).week() === date,
              );
              return sumBy(
                result,
                (item) =>
                  item._sum.salesPrice +
                  item._sum.cardCommission +
                  item._sum.serviceCommission +
                  item._sum.setoff,
              );
            }),
          },
          {
            name: '미래정산 금액',
            type: 'bar',
            stack: 'FutureFund',
            data: dateRanges.map((date) => {
              const result = futureFund.filter(
                (item) => dayjs(item.fundGroupAt).week() === date,
              );
              return sumBy(result, (item) => item._sum.applyPrice);
            }),
          },
          {
            name: '합계',
            type: 'bar',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const prefundList = prefund.filter(
                (item) => dayjs(item.prefundGroupAt).week() === date,
              );
              const futureFundList = futureFund.filter(
                (item) => dayjs(item.fundGroupAt).week() === date,
              );
              return (
                sumBy(futureFundList, (item) => item._sum.applyPrice) +
                sumBy(
                  prefundList,
                  (item) =>
                    item._sum.salesPrice +
                    item._sum.cardCommission +
                    item._sum.serviceCommission +
                    item._sum.setoff,
                )
              );
            }),
          },
        ],
      };
    } else if (dateType === 'MONTHLY') {
      const dateRanges = makeDateRangeMonthly(startAt, endAt);

      return {
        xAxis: dateRanges,
        legend: ['선정산 금액', '미래정산 금액', '합계'],
        series: [
          {
            name: '선정산 금액',
            type: 'bar',
            stack: 'Prefund',
            data: dateRanges.map((date) => {
              const result = prefund.filter(
                (item) => monthToStr(dayjs(item.prefundGroupAt)) === date,
              );
              return sumBy(
                result,
                (item) =>
                  item._sum.salesPrice +
                  item._sum.cardCommission +
                  item._sum.serviceCommission +
                  item._sum.setoff,
              );
            }),
          },
          {
            name: '미래정산 금액',
            type: 'bar',
            stack: 'FutureFund',
            data: dateRanges.map((date) => {
              const result = futureFund.filter(
                (item) => monthToStr(dayjs(item.fundGroupAt)) === date,
              );
              return sumBy(result, (item) => item._sum.applyPrice);
            }),
          },
          {
            name: '합계',
            type: 'bar',
            stack: 'Total',
            data: dateRanges.map((date) => {
              const prefundList = prefund.filter(
                (item) => monthToStr(dayjs(item.prefundGroupAt)) === date,
              );
              const futureFundList = futureFund.filter(
                (item) => monthToStr(dayjs(item.fundGroupAt)) === date,
              );
              return (
                sumBy(futureFundList, (item) => item._sum.applyPrice) +
                sumBy(
                  prefundList,
                  (item) =>
                    item._sum.salesPrice +
                    item._sum.cardCommission +
                    item._sum.serviceCommission +
                    item._sum.setoff,
                )
              );
            }),
          },
        ],
      };
    }

    return {
      xAxis: [],
      legend: [],
      series: [],
    };
  }
}
