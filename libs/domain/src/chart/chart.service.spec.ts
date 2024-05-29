import { GomiCommission } from '@app/domain/prefund/gomi-commission';
import { PrismaService } from '@app/utils/prisma';

import { faker } from '@faker-js/faker';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CardCompanyName,
  FutureFundType,
  PrefundByCard,
  PrefundStatus,
  User,
} from '@prisma/client';
import * as dayjs from 'dayjs';

import { ChartService } from './chart.service';

const mockPrefundByCard = (userId: number, date: string): PrefundByCard => ({
  id: undefined,
  createdAt: dayjs(date).toDate(),
  updatedAt: dayjs(date).toDate(),
  prefundGroupAt: dayjs(date).add(1, 'day').format('YYYY-MM-DD'),
  salesGroupAt: dayjs(date).format('YYYY-MM-DD'),
  cardSettlementGroupAt: dayjs(date).add(3, 'day').format('YYYY-MM-DD'),
  status: PrefundStatus.DEPOSIT_DONE,
  prefundAt: dayjs(date).add(1, 'day').format('YYYY-MM-DD'),
  depositAt: dayjs(date).add(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
  cardCompanyName: CardCompanyName.NH_CARD,
  userId,
  salesPrice: 100_000,
  cardCommission: -1500,
  serviceCommission: GomiCommission.calculateGomiCommission({
    transactionAt: dayjs(date),
    requestAt: dayjs(date).add(1, 'day'),
    salesPrice: 100_000,
    commission: -1500,
    defaultBusinessDay: 3,
    substituteHolidayList: [],
    byBusinessDay: true,
  }).serviceCommission,
  setoff: 0,
  applyId: null,
});

const mockFutureFund = (
  userId: number,
  date: string,
  type: FutureFundType,
) => ({
  fundGroupAt: dayjs(date).add(1, 'day').format('YYYY-MM-DD'),
  ...(type === FutureFundType.REPAYMENT && {
    repaymentFees: -50000,
    repaymentPrice: -10000,
  }),
  ...(type === FutureFundType.APPLY && {
    applyPrice: 500000,
  }),
  futureFundType: FutureFundType.REPAYMENT,
  User: {
    connect: {
      id: userId,
    },
  },
  PrefundByCard: {
    create: mockPrefundByCard(userId, date),
  },
});

describe('ChartService', () => {
  const startAt = '2099-03-01';
  const endAt = '2099-03-15';
  let service: ChartService;
  let prismaService: PrismaService;
  let user: User;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, ChartService],
    }).compile();

    service = module.get<ChartService>(ChartService);
    prismaService = module.get<PrismaService>(PrismaService);
    user = await prismaService.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.person.firstName(),
      },
    });

    await prismaService.prefundByCard.createMany({
      data: [
        mockPrefundByCard(user.id, '2099-03-03'),
        mockPrefundByCard(user.id, '2099-03-07'),
        mockPrefundByCard(user.id, '2099-03-10'),
        mockPrefundByCard(user.id, '2099-03-14'),
        mockPrefundByCard(user.id, '2099-03-17'),
      ],
    });

    await prismaService.futureFund.create({
      data: mockFutureFund(user.id, '2099-03-01', FutureFundType.APPLY),
    });
    await prismaService.futureFund.create({
      data: mockFutureFund(user.id, '2099-03-04', FutureFundType.REPAYMENT),
    });
    await prismaService.futureFund.create({
      data: mockFutureFund(user.id, '2099-03-08', FutureFundType.REPAYMENT),
    });
    await prismaService.futureFund.create({
      data: mockFutureFund(user.id, '2099-03-11', FutureFundType.APPLY),
    });
    await prismaService.futureFund.create({
      data: mockFutureFund(user.id, '2099-03-13', FutureFundType.REPAYMENT),
    });
  });

  afterAll(async () => {
    await prismaService.user.delete({
      where: {
        id: user.id,
      },
    });
  });

  describe('activeUser', () => {
    it('2099-03-01 ~ 2099-03-15 기간 동안 데일리 활성 유저 수', async () => {
      // given
      // when
      const result = await service.activeUser('DAILY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: [
          '2099-03-01',
          '2099-03-02',
          '2099-03-03',
          '2099-03-04',
          '2099-03-05',
          '2099-03-06',
          '2099-03-07',
          '2099-03-08',
          '2099-03-09',
          '2099-03-10',
          '2099-03-11',
          '2099-03-12',
          '2099-03-13',
          '2099-03-14',
          '2099-03-15',
        ],
        legend: ['선정산 이용 수', '미래정산 이용 수', '합계'],
        series: [
          {
            data: [0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1],
            name: '선정산 이용 수',
            stack: 'prefund',
            type: 'line',
          },
          {
            data: [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0],
            name: '미래정산 이용 수',
            stack: 'futureFund',
            type: 'line',
          },
          {
            data: [0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1],
            name: '합계',
            stack: 'Total',
            type: 'line',
          },
        ],
      });
    });

    it('2099-03-01 ~ 2099-03-15 기간 동안 위클리 활성 유저 수', async () => {
      // given
      // when
      const result = await service.activeUser('WEEKLY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: ['10주차', '11주차', '12주차'],
        legend: ['선정산 이용 수', '미래정산 이용 수', '합계'],
        series: [
          {
            data: [1, 1, 1],
            name: '선정산 이용 수',
            stack: 'prefund',
            type: 'line',
          },
          {
            data: [1, 1, 0],
            name: '미래정산 이용 수',
            stack: 'futureFund',
            type: 'line',
          },
          {
            data: [1, 1, 1],
            name: '합계',
            stack: 'Total',
            type: 'line',
          },
        ],
      });
    });

    it('2099-03-01 ~ 2099-03-15 기간 동안 월별 활성 유저 수', async () => {
      // given
      // when
      const result = await service.activeUser('MONTHLY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: ['2099.3'],
        legend: ['선정산 이용 수', '미래정산 이용 수', '합계'],
        series: [
          {
            data: [1],
            name: '선정산 이용 수',
            stack: 'prefund',
            type: 'line',
          },
          {
            data: [1],
            name: '미래정산 이용 수',
            stack: 'futureFund',
            type: 'line',
          },
          {
            data: [1],
            name: '합계',
            stack: 'Total',
            type: 'line',
          },
        ],
      });
    });
  });

  describe('prefund', () => {
    it('2099-03-01 ~ 2099-03-15 기간 동안 데일리 선정산', async () => {
      // given
      // when
      const result = await service.prefund('DAILY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: [
          '2099-03-01',
          '2099-03-02',
          '2099-03-03',
          '2099-03-04',
          '2099-03-05',
          '2099-03-06',
          '2099-03-07',
          '2099-03-08',
          '2099-03-09',
          '2099-03-10',
          '2099-03-11',
          '2099-03-12',
          '2099-03-13',
          '2099-03-14',
          '2099-03-15',
        ],
        legend: [user.name, '합계'],
        series: [
          {
            data: [
              0, 98303, 0, 98303, 98106, 0, 0, 98205, 98303, 0, 98303, 98106, 0,
              98106, 98205,
            ],
            name: user.name,
            stack: expect.any(String),
            type: 'line',
          },
          {
            data: [
              0, 98303, 0, 98303, 98106, 0, 0, 98205, 98303, 0, 98303, 98106, 0,
              98106, 98205,
            ],
            name: '합계',
            stack: 'Total',
            type: 'line',
          },
        ],
      });
    });

    it('2099-03-01 ~ 2099-03-15 기간 동안 위클리 선정산', async () => {
      // given
      // when
      const result = await service.prefund('WEEKLY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: ['10주차', '11주차', '12주차'],
        legend: [user.name, '합계'],
        series: [
          {
            data: [294712, 491023, 98205],
            name: user.name,
            stack: expect.any(String),
            type: 'line',
          },
          {
            data: [294712, 491023, 98205],
            name: '합계',
            stack: 'Total',
            type: 'line',
          },
        ],
      });
    });

    it('2099-03-01 ~ 2099-03-15 기간 동안 월별 선정산', async () => {
      // given
      // when
      const result = await service.prefund('MONTHLY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: ['2099.3'],
        legend: [user.name, '합계'],
        series: [
          {
            data: [883940],
            name: user.name,
            stack: expect.any(String),
            type: 'line',
          },
          {
            data: [883940],
            name: '합계',
            stack: 'Total',
            type: 'line',
          },
        ],
      });
    });
  });

  describe('gmv', () => {
    it('2099-03-01 ~ 2099-03-15 기간 동안 데일리 gmv', async () => {
      // given
      // when
      const result = await service.gmv('DAILY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: [
          '2099-03-01',
          '2099-03-02',
          '2099-03-03',
          '2099-03-04',
          '2099-03-05',
          '2099-03-06',
          '2099-03-07',
          '2099-03-08',
          '2099-03-09',
          '2099-03-10',
          '2099-03-11',
          '2099-03-12',
          '2099-03-13',
          '2099-03-14',
          '2099-03-15',
        ],
        legend: ['선정산 금액', '미래정산 금액', '합계'],
        series: [
          {
            data: [
              0, 98303, 0, 98303, 98106, 0, 0, 98205, 98303, 0, 98303, 98106, 0,
              98106, 98205,
            ],
            name: '선정산 금액',
            stack: 'Prefund',
            type: 'bar',
          },
          {
            data: [0, 500000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 500000, 0, 0, 0],
            name: '미래정산 금액',
            stack: 'FutureFund',
            type: 'bar',
          },
          {
            data: [
              0, 598303, 0, 98303, 98106, 0, 0, 98205, 98303, 0, 98303, 598106,
              0, 98106, 98205,
            ],
            name: '합계',
            stack: 'Total',
            type: 'bar',
          },
        ],
      });
    });

    it('2099-03-01 ~ 2099-03-15 기간 동안 weekly gmv', async () => {
      // given
      // when
      const result = await service.gmv('WEEKLY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: ['10주차', '11주차', '12주차'],
        legend: ['선정산 금액', '미래정산 금액', '합계'],
        series: [
          {
            data: [294712, 491023, 98205],
            name: '선정산 금액',
            stack: 'Prefund',
            type: 'bar',
          },
          {
            data: [500000, 500000, 0],
            name: '미래정산 금액',
            stack: 'FutureFund',
            type: 'bar',
          },
          {
            data: [794712, 991023, 98205],
            name: '합계',
            stack: 'Total',
            type: 'bar',
          },
        ],
      });
    });

    it('2099-03-01 ~ 2099-03-15 기간 동안 월별 gmv', async () => {
      // given
      // when
      const result = await service.gmv('MONTHLY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: ['2099.3'],
        legend: ['선정산 금액', '미래정산 금액', '합계'],
        series: [
          {
            data: [883940],
            name: '선정산 금액',
            stack: 'Prefund',
            type: 'bar',
          },
          {
            data: [1000000],
            name: '미래정산 금액',
            stack: 'FutureFund',
            type: 'bar',
          },
          {
            data: [1883940],
            name: '합계',
            stack: 'Total',
            type: 'bar',
          },
        ],
      });
    });
  });

  describe('futureFund', () => {
    it('2099-03-01 ~ 2099-03-15 기간 동안 데일리 미래정산', async () => {
      // given
      // when
      const result = await service.futureFund('DAILY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: [
          '2099-03-01',
          '2099-03-02',
          '2099-03-03',
          '2099-03-04',
          '2099-03-05',
          '2099-03-06',
          '2099-03-07',
          '2099-03-08',
          '2099-03-09',
          '2099-03-10',
          '2099-03-11',
          '2099-03-12',
          '2099-03-13',
          '2099-03-14',
          '2099-03-15',
        ],
        legend: [user.name, '합계'],
        series: [
          {
            data: [0, 500000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 500000, 0, 0, 0],
            name: user.name,
            stack: expect.any(String),
            type: 'line',
          },
          {
            data: [0, 500000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 500000, 0, 0, 0],
            name: '합계',
            stack: 'Total',
            type: 'line',
          },
        ],
      });
    });

    it('2099-03-01 ~ 2099-03-15 기간 동안 위클리 미래정산', async () => {
      // given
      // when
      const result = await service.futureFund('WEEKLY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: ['10주차', '11주차', '12주차'],
        legend: [user.name, '합계'],
        series: [
          {
            data: [500000, 500000, 0],
            name: user.name,
            stack: expect.any(String),
            type: 'line',
          },
          {
            data: [500000, 500000, 0],
            name: '합계',
            stack: 'Total',
            type: 'line',
          },
        ],
      });
    });

    it('2099-03-01 ~ 2099-03-15 기간 동안 월별 미래정산', async () => {
      // given
      // when
      const result = await service.futureFund('MONTHLY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: ['2099.3'],
        legend: [user.name, '합계'],
        series: [
          {
            data: [1000000],
            name: user.name,
            stack: expect.any(String),
            type: 'line',
          },
          {
            data: [1000000],
            name: '합계',
            stack: 'Total',
            type: 'line',
          },
        ],
      });
    });
  });

  describe('profit', () => {
    it('2099-03-01 ~ 2099-03-15 기간 동안 데일리 수익금', async () => {
      // given
      // when
      const result = await service.profit('DAILY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: [
          '2099-03-01',
          '2099-03-02',
          '2099-03-03',
          '2099-03-04',
          '2099-03-05',
          '2099-03-06',
          '2099-03-07',
          '2099-03-08',
          '2099-03-09',
          '2099-03-10',
          '2099-03-11',
          '2099-03-12',
          '2099-03-13',
          '2099-03-14',
          '2099-03-15',
        ],
        legend: ['선정산 수수료', '미래정산 수수료', '합계'],
        series: [
          {
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            name: '선정산 수수료',
            stack: 'prefund',
            type: 'line',
          },
          {
            data: [0, 0, 0, 0, 50000, 0, 0, 0, 50000, 0, 0, 0, 0, 50000, 0],
            name: '미래정산 수수료',
            stack: 'futureFund',
            type: 'line',
          },
          {
            data: [0, 0, 0, 0, 50000, 0, 0, 0, 50000, 0, 0, 0, 0, 50000, 0],
            name: '합계',
            stack: 'Total',
            type: 'line',
          },
        ],
      });
    });

    it('2099-03-01 ~ 2099-03-15 기간 동안 Weekly 수익금', async () => {
      // given
      // when
      const result = await service.profit('WEEKLY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: ['10주차', '11주차', '12주차'],
        legend: ['선정산 수수료', '미래정산 수수료', '합계'],
        series: [
          {
            data: [0, 0, 0],
            name: '선정산 수수료',
            stack: 'prefund',
            type: 'line',
          },
          {
            data: [50000, 100000, 0],
            name: '미래정산 수수료',
            stack: 'futureFund',
            type: 'line',
          },
          {
            data: [50000, 100000, 0],
            name: '합계',
            stack: 'Total',
            type: 'line',
          },
        ],
      });
    });

    it('2099-03-01 ~ 2099-03-15 기간 동안 월별 수익금', async () => {
      // given
      // when
      const result = await service.profit('MONTHLY', startAt, endAt);

      // then
      expect(result).toEqual({
        xAxis: ['2099.3'],
        legend: ['선정산 수수료', '미래정산 수수료', '합계'],
        series: [
          {
            data: [0],
            name: '선정산 수수료',
            stack: 'prefund',
            type: 'line',
          },
          {
            data: [150000],
            name: '미래정산 수수료',
            stack: 'futureFund',
            type: 'line',
          },
          {
            data: [150000],
            name: '합계',
            stack: 'Total',
            type: 'line',
          },
        ],
      });
    });
  });
});
