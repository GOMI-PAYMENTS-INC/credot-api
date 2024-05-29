import { PrefundOfficeService } from '@app/domain/prefund';
import { PrismaService } from '@app/utils/prisma';

import { faker } from '@faker-js/faker';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CardCompanyName,
  FutureFundType,
  PrefundStatus,
  User,
} from '@prisma/client';

describe('PrefundOfficeService', () => {
  let prisma: PrismaService;
  let service: PrefundOfficeService;

  let user: User;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PrefundOfficeService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    service = module.get<PrefundOfficeService>(PrefundOfficeService);

    user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.internet.userName(),
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

  describe('summary', () => {
    it('2023-11-05 일의 선정산 요약 정보를 불러온다.', async () => {
      // given
      const date = '2023-11-05';
      const input = await prisma.prefundByCard.create({
        data: {
          prefundGroupAt: '2023-11-05',
          status: PrefundStatus.DONE,
          cardCompanyName: CardCompanyName.SHINHAN_CARD,
          userId: user.id,
          salesPrice: 45_000,
          cardCommission: -4_500,
          serviceCommission: -45,
          cardSettlementGroupAt: '2023-11-09',
          salesGroupAt: '2023-11-04',
        },
      });
      await prisma.futureFund.createMany({
        data: [
          {
            futureFundType: FutureFundType.APPLY,
            fundGroupAt: '2023-11-04',
            userId: user.id,
            price: 0,
            applyPrice: 1_000_000,
            accrualFees: 0,
            accumulatedFees: 0,
          },
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: '2023-11-05',
            userId: user.id,
            price: 1_000_000,
            accrualFees: 1_000,
            accumulatedFees: 1_000,
          },
          {
            futureFundType: FutureFundType.REPAYMENT,
            fundGroupAt: '2023-11-05',
            userId: user.id,
            repaymentPrice: -39_455,
            repaymentFees: -1_000,
            prefundByCardId: input.id,
          },
        ],
      });

      // when
      const result = await service.summary(date, user.id);

      // then
      expect(result).toEqual({
        salesPrice: 45_000,
        cardCommission: -4_500,
        serviceCommission: -45,
        setoff: 0,
        prefundPrice: 40_455,
        repaymentFees: -1_000,
        repaymentPrice: -39_455,
        depositPrice: 0,
      });
    });

    it('2023-11-05 일의 선정산 정보는 존재하고 미래 정산은 없을 때 선정산 요약 정보를 불러온다.', async () => {
      // given
      const date = '2023-11-05';
      await prisma.prefundByCard.create({
        data: {
          prefundGroupAt: '2023-11-05',
          status: PrefundStatus.DONE,
          cardCompanyName: CardCompanyName.SHINHAN_CARD,
          userId: user.id,
          salesPrice: 45_000,
          cardCommission: -4_500,
          serviceCommission: -45,
          cardSettlementGroupAt: '2023-11-09',
          salesGroupAt: '2023-11-04',
        },
      });

      // when
      const result = await service.summary(date, user.id);

      // then
      expect(result).toEqual({
        salesPrice: 45_000,
        cardCommission: -4_500,
        serviceCommission: -45,
        setoff: 0,
        prefundPrice: 40_455,
        repaymentFees: 0,
        repaymentPrice: 0,
        depositPrice: 40_455,
      });
    });

    it('2023-11-06 일의 선정산 요약 정보가 없을 경우 정상적으로 처리 된다.', async () => {
      // given
      const date = '2023-11-06';

      // when
      const result = await service.summary(date, user.id);

      // then
      expect(result).toEqual({
        salesPrice: 0,
        cardCommission: 0,
        serviceCommission: 0,
        setoff: 0,
        prefundPrice: 0,
        repaymentFees: 0,
        repaymentPrice: 0,
        depositPrice: 0,
      });
    });
  });

  describe('list', () => {
    it('생성된 카드별 선정산 내용이 정상적으로 리턴된다.', async () => {
      // given
      const startAt = '2023-11-05';
      const endAt = '2023-11-11';
      const status = PrefundStatus.DONE;
      const input = await prisma.prefundByCard.create({
        data: {
          prefundGroupAt: '2023-11-07',
          status: PrefundStatus.DONE,
          cardCompanyName: CardCompanyName.SHINHAN_CARD,
          userId: user.id,
          salesPrice: 45_000,
          cardCommission: -4_500,
          serviceCommission: -45,
          cardSettlementGroupAt: '2023-11-09',
          salesGroupAt: '2023-11-06',
        },
      });
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
            fundGroupAt: '2023-11-07',
            userId: user.id,
            price: 1_000_000,
            accrualFees: 1_000,
            accumulatedFees: 1_000,
          },
          {
            futureFundType: FutureFundType.REPAYMENT,
            fundGroupAt: '2023-11-07',
            userId: user.id,
            repaymentPrice: -39_455,
            repaymentFees: -1_000,
            prefundByCardId: input.id,
          },
        ],
      });

      // when
      const result = await service.list({
        endAt,
        startAt,
        status,
        userId: user.id,
      });

      // then
      expect(result).toEqual([
        {
          cardCommission: -4500,
          cardCompanyName: '신한카드',
          cardSettlementGroupAt: '2023-11-09',
          id: input.id,
          name: user.name,
          prefundAt: null,
          depositAt: null,
          salesGroupAt: '2023-11-06',
          prefundGroupAt: '2023-11-07',
          salesPrice: 45_000,
          serviceCommission: -45,
          repaymentFees: -1000,
          repaymentPrice: -39455,
          setoff: 0,
          status: '완료',
          prefundPrice: 40_455,
          depositPrice: 0,
          cardSettlementPrice: 40_500,
        },
      ]);
    });

    it('2023-11-05 ~ 2023-11-11 사이의 진핸 중인 카드가 없을 경우 빈배열을 리턴한다.', async () => {
      // given
      const startAt = '2023-11-05';
      const endAt = '2023-11-11';
      const status = PrefundStatus.READY;
      await prisma.prefundByCard.create({
        data: {
          prefundGroupAt: '2023-11-07',
          status: PrefundStatus.DONE,
          cardCompanyName: CardCompanyName.SHINHAN_CARD,
          userId: user.id,
          cardSettlementGroupAt: '2023-11-09',
          salesGroupAt: '2023-11-06',
        },
      });

      // when
      const result = await service.list({
        endAt,
        startAt,
        status,
        userId: user.id,
      });

      // then
      expect(result).toEqual([]);
    });
  });
});
