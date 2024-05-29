import { FutureFundService, getFutureFundDoneCount } from '@app/domain/prefund';
import { PrismaService } from '@app/utils/prisma';

import { faker } from '@faker-js/faker';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CardCompanyName,
  FutureFundType,
  PrefundStatus,
  User,
} from '@prisma/client';
import * as dayjs from 'dayjs';

describe('FutureFundService', () => {
  const FUTURE_FUND_SERVICE_FEE_RATE = 0.001;
  let prisma: PrismaService;
  let service: FutureFundService;

  let user: User;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, FutureFundService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    service = module.get<FutureFundService>(FutureFundService);

    user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.internet.userName(),
        futureFundServiceFeeRate: FUTURE_FUND_SERVICE_FEE_RATE,
      },
    });
  });

  afterEach(async () => {
    await prisma.prefundByCard.deleteMany({
      where: {
        userId: user.id,
      },
    });
    await prisma.futureFund.deleteMany({
      where: {
        userId: user.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });

    await prisma.$disconnect();
  });

  describe('getFutureFundDoneCount', () => {
    it('미래 정산 완료 횟수를 가져온다.', async () => {
      // given
      const applyList = [
        10_000_000, 7_106_383, 2_966_567, 2_785_079, 5_434_329, 5_884_802,
        6_731_110,
      ];
      const repaymentPriceList = [
        -7_106_383, -2_966_567, -2_785_079, -5_434_329, -5_884_802, -6_731_110,
        -10_000_000,
      ];

      // when
      const result = getFutureFundDoneCount(applyList, repaymentPriceList);

      // then
      expect(result).toBe(5);
    });
  });

  describe('repayment', () => {
    it('18일에 발생한 선정산금이 미래 정산 원금보다 작을 경우 수수료 & 원금 일부를 상환한다.', async () => {
      // given
      const prefundGroupAt = '2023-11-18';
      await prisma.prefundByCard.createMany({
        data: [
          {
            prefundGroupAt,
            status: PrefundStatus.DONE,
            userId: user.id,
            cardCompanyName: CardCompanyName.SHINHAN_CARD,
            salesPrice: 35000,
            cardCommission: -350,
            serviceCommission: -35,
            setoff: -2000,
            cardSettlementGroupAt: '2023-11-09',
            salesGroupAt: '2023-11-06',
          },
          {
            prefundGroupAt,
            status: PrefundStatus.DONE,
            userId: user.id,
            cardCompanyName: CardCompanyName.KB_CARD,
            salesPrice: 70000,
            cardCommission: -700,
            serviceCommission: -70,
            setoff: 0,
            cardSettlementGroupAt: '2023-11-09',
            salesGroupAt: '2023-11-06',
          },
        ],
      });
      await prisma.futureFund.createMany({
        data: [
          {
            futureFundType: FutureFundType.APPLY,
            fundGroupAt: '2023-11-17',
            userId: user.id,
            price: 0,
            applyPrice: 1_000_000,
            accrualFees: 0,
            accumulatedFees: 0,
          },
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: prefundGroupAt,
            userId: user.id,
            price: 1_000_000,
            accrualFees: 1_000,
            accumulatedFees: 1_000,
          },
        ],
      });

      // when
      const result: { repaymentFees: number; repaymentPrice: number } | null =
        await service.repayment(user.id, prefundGroupAt, { tx: prisma });

      // then
      expect(result.repaymentFees).toBe(-1_000);
      expect(result.repaymentPrice).toBe(-100_845);
    });

    it('18일에 발생한 선정산금이 미래 정산 수수료보다 작을 경우 수수료만 상환한다.', async () => {
      // given
      const prefundGroupAt = '2023-11-18';
      await prisma.prefundByCard.createMany({
        data: [
          {
            prefundGroupAt,
            status: PrefundStatus.DONE,
            userId: user.id,
            cardCompanyName: CardCompanyName.SHINHAN_CARD,
            salesPrice: 1000,
            cardCommission: -10,
            serviceCommission: -1,
            setoff: 0,
            cardSettlementGroupAt: '2023-11-09',
            salesGroupAt: '2023-11-06',
          },
        ],
      });
      await prisma.futureFund.createMany({
        data: [
          {
            futureFundType: FutureFundType.APPLY,
            fundGroupAt: '2023-11-17',
            userId: user.id,
            price: 0,
            applyPrice: 1_000_000,
            accrualFees: 0,
            accumulatedFees: 0,
          },
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: prefundGroupAt,
            userId: user.id,
            price: 1_000_000,
            accrualFees: 1_000,
            accumulatedFees: 1_000,
          },
        ],
      });

      // when
      const result: { repaymentFees: number; repaymentPrice: number } | null =
        await service.repayment(user.id, prefundGroupAt, { tx: prisma });

      // then
      expect(result.repaymentFees).toBe(-989);
      expect(result.repaymentPrice).toBe(0);
    });

    it('18일에 발생한 선정산금이 미래 정산 원금과 수수료보다 클 경우 모두 상환한다.', async () => {
      // given
      const prefundGroupAt = '2023-11-18';
      await prisma.prefundByCard.createMany({
        data: [
          {
            prefundGroupAt,
            status: PrefundStatus.DONE,
            userId: user.id,
            cardCompanyName: CardCompanyName.SHINHAN_CARD,
            salesPrice: 2_000_000,
            cardCommission: -2000,
            serviceCommission: -200,
            setoff: 0,
            cardSettlementGroupAt: '2023-11-09',
            salesGroupAt: '2023-11-06',
          },
        ],
      });
      await prisma.futureFund.createMany({
        data: [
          {
            futureFundType: FutureFundType.APPLY,
            fundGroupAt: '2023-11-17',
            userId: user.id,
            price: 0,
            applyPrice: 1_000_000,
            accrualFees: 0,
            accumulatedFees: 0,
          },
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: prefundGroupAt,
            userId: user.id,
            price: 1_000_000,
            accrualFees: 1_000,
            accumulatedFees: 1_000,
          },
        ],
      });

      // when
      const result: { repaymentFees: number; repaymentPrice: number } | null =
        await service.repayment(user.id, prefundGroupAt, { tx: prisma });

      // then
      expect(result.repaymentFees).toBe(-1000);
      expect(result.repaymentPrice).toBe(-1_000_000);
    });

    it('18일에 발생한 선정산금으로 미래 정산 내역을 상황했을 경우 릴레이션을 가지도록 처리한다.', async () => {
      // given
      const prefundGroupAt = '2023-11-18';
      await prisma.prefundByCard.createMany({
        data: [
          {
            prefundGroupAt,
            status: PrefundStatus.DONE,
            userId: user.id,
            cardCompanyName: CardCompanyName.SHINHAN_CARD,
            salesPrice: 2_000_000,
            cardCommission: -2000,
            serviceCommission: -200,
            setoff: 0,
            cardSettlementGroupAt: '2023-11-09',
            salesGroupAt: '2023-11-06',
          },
        ],
      });
      await prisma.futureFund.createMany({
        data: [
          {
            futureFundType: FutureFundType.APPLY,
            fundGroupAt: '2023-11-17',
            userId: user.id,
            price: 0,
            applyPrice: 1_000_000,
            accrualFees: 0,
            accumulatedFees: 0,
          },
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: prefundGroupAt,
            userId: user.id,
            price: 1_000_000,
            accrualFees: 1_000,
            accumulatedFees: 1_000,
          },
        ],
      });

      // when
      await service.repayment(user.id, prefundGroupAt, { tx: prisma });

      // then
      const repayment = await prisma.futureFund.findFirst({
        where: {
          userId: user.id,
          fundGroupAt: prefundGroupAt,
          futureFundType: FutureFundType.REPAYMENT_READY,
        },
      });
      expect(repayment).toBeTruthy();
      expect(repayment.prefundByCardId).toBeDefined();
    });

    it('18일에 발생한 선정산금은 있지만 미래 정산 내역이 없을 경우 상환 처리되지 않는다.', async () => {
      // given
      const prefundGroupAt = '2023-11-18';

      // when
      const result: { repaymentFees: number; repaymentPrice: number } | null =
        await service.repayment(user.id, prefundGroupAt, { tx: prisma });

      // then
      expect(result).toBe(null);
    });
  });

  describe('calculate', () => {
    it('18일 선정산금으로 미래 정산 원금 일부와 수수료를 상환했을 때 19일의 미래 정산 데이터를 생성한다.', async () => {
      // given
      const fundGroupAt = '2023-11-19';
      await prisma.futureFund.createMany({
        data: [
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: '2023-11-18',
            userId: user.id,
            price: 1_000_000,
            accrualFees: 1_000,
            accumulatedFees: 1_000,
          },
          {
            futureFundType: FutureFundType.REPAYMENT,
            fundGroupAt: '2023-11-18',
            userId: user.id,
            applyPrice: 300_000,
          },
          {
            futureFundType: FutureFundType.REPAYMENT,
            fundGroupAt: '2023-11-18',
            userId: user.id,
            repaymentPrice: -39_455,
            repaymentFees: -1_000,
          },
        ],
      });

      // when
      const result = await service.calculate(user.id, fundGroupAt);

      // then
      expect(result.price).toBe(1_260_545);
      expect(result.accumulatedFees).toBe(1260);
      expect(result.accrualFees).toBe(1260);
    });

    it('18일 선정산이 없어 미래 정산 원금 일부와 수수료를 상환하지 못했을 때 19일의 미래 정산 데이터를 생성한다.', async () => {
      // given
      const fundGroupAt = '2023-11-19';
      await prisma.futureFund.createMany({
        data: [
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: '2023-11-18',
            userId: user.id,
            price: 1_000_000,
            accrualFees: 1_000,
            accumulatedFees: 1_000,
          },
          {
            futureFundType: FutureFundType.REPAYMENT,
            fundGroupAt: '2023-11-18',
            userId: user.id,
            applyPrice: 300_000,
          },
        ],
      });

      // when
      const result = await service.calculate(user.id, fundGroupAt);

      // then
      expect(result.price).toBe(1_300_000);
      expect(result.accumulatedFees).toBe(2300);
      expect(result.accrualFees).toBe(1300);
    });
  });

  describe('manualRepayment', () => {
    it('미래 정산 50만원과 미래 정산 수수료 1만원을 상환한다.', async () => {
      // given
      const repaymentPrice = 500_000;
      const repaymentFees = 10_000;
      const date = dayjs('2023-11-01').format('YYYY-MM-DD');

      // when
      const result = await service.manualRepayment({
        userId: user.id,
        date,
        repaymentPrice,
        repaymentFees,
      });

      // then
      expect(result.futureFundType).toBe(FutureFundType.REPAYMENT);
      expect(result.fundGroupAt).toBe('2023-11-01');
      expect(result.repaymentPrice).toBe(-500_000);
      expect(result.repaymentFees).toBe(-10_000);
    });
  });

  describe('apply', () => {
    it('미래 정산 100만원을 신청할 수 있다.', async () => {
      // given
      const price = 1_000_000;
      const date = dayjs('2023-11-01').format('YYYY-MM-DD');

      // when
      const result = await service.apply({
        userId: user.id,
        date,
        price,
      });

      // then
      expect(result.futureFundType).toBe(FutureFundType.APPLY);
      expect(result.fundGroupAt).toBe('2023-11-01');
      expect(result.applyPrice).toBe(1_000_000);
    });
  });

  describe('list', () => {
    it('기간별 조회 시 정상적으로 응답한다.', async () => {
      // given
      const startAt = '2023-11-15';
      const endAt = '2023-11-22';
      await prisma.futureFund.createMany({
        data: [
          {
            futureFundType: FutureFundType.APPLY,
            fundGroupAt: '2023-11-17',
            userId: user.id,
            price: 0,
            applyPrice: 1_000_000,
            accrualFees: 0,
            accumulatedFees: 0,
          },
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: '2023-11-18',
            userId: user.id,
            price: 1_000_000,
            accrualFees: 1_000,
            accumulatedFees: 1_000,
          },
          {
            futureFundType: FutureFundType.REPAYMENT,
            fundGroupAt: '2023-11-18',
            userId: user.id,
            repaymentPrice: -39_455,
            repaymentFees: -1_000,
            prefundByCardId: null,
          },
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: '2023-11-19',
            userId: user.id,
            price: 960_545,
            accrualFees: 960,
            accumulatedFees: 960,
          },
        ],
      });

      // when
      const result = await service.list({ startAt, endAt, userId: user.id });

      // then
      expect(result).toEqual([
        {
          fundGroupAt: '2023-11-19',
          price: 960_545,
          applyPrice: 0,
          accrualFees: 960,
          accumulatedFees: 960,
          repaymentFees: 0,
          repaymentPrice: 0,
        },
        {
          fundGroupAt: '2023-11-18',
          price: 960_545,
          applyPrice: 0,
          accrualFees: 1_000,
          accumulatedFees: 1_000,
          repaymentFees: -1_000,
          repaymentPrice: -39_455,
        },
        {
          fundGroupAt: '2023-11-17',
          price: 0,
          applyPrice: 1_000_000,
          accrualFees: 0,
          accumulatedFees: 0,
          repaymentFees: 0,
          repaymentPrice: 0,
        },
      ]);
    });

    it('추가 미래 정산 신청이 있는 기간별 조회 시 정상적으로 응답한다.', async () => {
      // given
      const startAt = '2023-11-15';
      const endAt = '2023-11-22';
      await prisma.futureFund.createMany({
        data: [
          {
            futureFundType: FutureFundType.APPLY,
            fundGroupAt: '2023-11-17',
            userId: user.id,
            price: 0,
            applyPrice: 1_000_000,
            accrualFees: 0,
            accumulatedFees: 0,
          },
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: '2023-11-18',
            userId: user.id,
            price: 1_000_000,
            accrualFees: 1_000,
            accumulatedFees: 1_000,
          },
          {
            futureFundType: FutureFundType.REPAYMENT,
            fundGroupAt: '2023-11-18',
            userId: user.id,
            repaymentPrice: -39_455,
            repaymentFees: -1_000,
            prefundByCardId: null,
          },
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: '2023-11-19',
            userId: user.id,
            price: 960_545,
            accrualFees: 960,
            accumulatedFees: 960,
          },
          {
            futureFundType: FutureFundType.APPLY,
            fundGroupAt: '2023-11-19',
            userId: user.id,
            price: 0,
            applyPrice: 1_000_000,
            accrualFees: 0,
            accumulatedFees: 0,
          },
        ],
      });

      // when
      const result = await service.list({ startAt, endAt, userId: user.id });

      // then
      expect(result).toEqual([
        {
          fundGroupAt: '2023-11-19',
          price: 960_545,
          applyPrice: 1_000_000,
          accrualFees: 960,
          accumulatedFees: 960,
          repaymentFees: 0,
          repaymentPrice: 0,
        },
        {
          fundGroupAt: '2023-11-18',
          price: 960_545,
          applyPrice: 0,
          accrualFees: 1_000,
          accumulatedFees: 1_000,
          repaymentFees: -1_000,
          repaymentPrice: -39_455,
        },
        {
          fundGroupAt: '2023-11-17',
          price: 0,
          applyPrice: 1_000_000,
          accrualFees: 0,
          accumulatedFees: 0,
          repaymentFees: 0,
          repaymentPrice: 0,
        },
      ]);
    });

    it('기간별 조회 시 데이터가 없을 경우 빈 배열로 응답한다.', async () => {
      // given
      const startAt = '2023-11-15';
      const endAt = '2023-11-22';

      // when
      const result = await service.list({ startAt, endAt, userId: user.id });

      // then
      expect(result).toEqual([]);
    });
  });

  describe('today', () => {
    it('2023-11-07일 미래 정산 내역을 리턴한다.', async () => {
      // given
      const today = '2023-11-07';
      await prisma.futureFund.createMany({
        data: [
          {
            futureFundType: FutureFundType.APPLY,
            fundGroupAt: '2023-11-06',
            userId: user.id,
            price: 0,
            applyPrice: 1_000_000,
            accrualFees: 0,
            accumulatedFees: 0,
          },
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: today,
            userId: user.id,
            price: 1_000_000,
            accrualFees: 1_000,
            accumulatedFees: 1_000,
          },
          {
            futureFundType: FutureFundType.REPAYMENT,
            fundGroupAt: today,
            userId: user.id,
            repaymentPrice: -39_455,
            repaymentFees: -1_000,
            prefundByCardId: null,
          },
        ],
      });

      // when
      const result = await service.today(today, user.id);

      // then
      expect(result).toEqual({
        futureFundInUse: 960_545,
        accumulatedFees: 1_000,
        limit: -960545,
        repaymentPrice: -39_455,
        accrualFees: 1_000,
        repaymentFees: -1_000,
        applyPrice: 0,
      });
    });

    it('2023-11-07일 미래 최초 정산 신청 했을 경우 내역을 리턴한다.', async () => {
      // given
      const today = '2023-11-07';
      await prisma.futureFund.createMany({
        data: [
          {
            futureFundType: FutureFundType.APPLY,
            fundGroupAt: today,
            userId: user.id,
            price: 0,
            applyPrice: 1_000_000,
            accrualFees: 0,
            accumulatedFees: 0,
          },
        ],
      });

      // when
      const result = await service.today(today, user.id);

      // then
      expect(result).toEqual({
        futureFundInUse: 1_000_000,
        accumulatedFees: 0,
        repaymentPrice: 0,
        limit: -1_000_000,
        accrualFees: 0,
        repaymentFees: 0,
        applyPrice: 1_000_000,
      });
    });
  });
});
