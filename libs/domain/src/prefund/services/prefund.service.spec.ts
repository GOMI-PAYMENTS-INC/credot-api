import { PrefundService } from '@app/domain/prefund';
import { PrismaService } from '@app/utils/prisma';

import { faker } from '@faker-js/faker';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CardCompanyName,
  FutureFundType,
  PrefundStatus,
  User,
} from '@prisma/client';

describe('PrefundService', () => {
  let prisma: PrismaService;
  let service: PrefundService;

  let user: User;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PrefundService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    service = module.get<PrefundService>(PrefundService);

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

  describe('today', () => {
    it('각 매출에 대해 오늘의 선정산 결과를 정상적으로 리턴한다.', async () => {
      // given
      const todayDate = '2023-11-07';
      await prisma.prefundByCard.createMany({
        data: [
          {
            prefundGroupAt: todayDate,
            status: PrefundStatus.DONE,
            cardCompanyName: CardCompanyName.SHINHAN_CARD,
            userId: user.id,
            cardSettlementGroupAt: '2023-11-09',
            salesGroupAt: '2023-11-06',
            salesPrice: 20000,
            cardCommission: -200,
            serviceCommission: -20,
            setoff: 0,
          },
          {
            prefundGroupAt: todayDate,
            status: PrefundStatus.DONE,
            cardCompanyName: CardCompanyName.NH_CARD,
            userId: user.id,
            cardSettlementGroupAt: '2023-11-08',
            salesGroupAt: '2023-11-06',
            salesPrice: 35000,
            cardCommission: -350,
            serviceCommission: -35,
            setoff: -2000,
          },
        ],
      });

      // when
      const result = await service.today(user.id, todayDate);

      // then
      expect(result).toEqual({
        prefund: 52_395,
        serviceCommission: -55,
        setoff: -2_000,
        preSalesPrice: 55_000,
        preCardCommission: -550,
        prefundAvgDate: 1.5,
      });
    });
    it('각 매출가 없을 경우 정상적으로 리턴한다.', async () => {
      // given
      const todayDate = '2023-11-07';

      // when
      const result = await service.today(user.id, todayDate);

      // then
      expect(result).toEqual({
        prefund: 0,
        serviceCommission: 0,
        setoff: 0,
        preSalesPrice: 0,
        preCardCommission: 0,
        prefundAvgDate: 0,
      });
    });
  });

  describe('todayDetails', () => {
    describe('오늘의 선정산 상세 테스트', () => {
      it('정상적으로 응답된다.', async () => {
        // given
        const todayDate = '2023-11-07';
        const defaultData = {
          prefundGroupAt: '2023-11-07',
          status: PrefundStatus.READY,
          userId: user.id,
        };
        await prisma.prefundByCard.create({
          data: {
            ...defaultData,
            cardCompanyName: CardCompanyName.SHINHAN_CARD,
            cardSettlementGroupAt: '2023-11-08',
            salesGroupAt: '2023-11-05',
          },
        });

        // when
        const [record] = await service.todayDetails(user.id, todayDate);

        // then
        expect(record).toEqual({
          cardCompanyName: '신한카드',
          date: '2023-11-07',
          preCardCommission: 0,
          preFundDate: null,
          preFundPrice: 0,
          preSalesPrice: 0,
          rowSpan: 2,
          rowSpanForSalesGroupAt: 1,
          salesGroupAt: '2023-11-05',
          serviceCommission: 0,
          setoff: 0,
          status: '입금 대기',
          prefundAvgDate: 1,
        });
      });
    });

    describe('프론트 테이블 병합에 관련한 로직 테스트', () => {
      it('조회 데이터가 2개일 경우 첫번째 레코드의 rowSpan은 전체 조회 수 + 1이다.', async () => {
        // given
        const todayDate = '2023-11-07';
        const defaultData = {
          prefundGroupAt: '2023-11-07',
          status: PrefundStatus.READY,
          userId: user.id,
        };
        await prisma.prefundByCard.createMany({
          data: [
            {
              ...defaultData,
              cardCompanyName: CardCompanyName.SHINHAN_CARD,
              cardSettlementGroupAt: '2023-11-08',
              salesGroupAt: '2023-11-05',
            },
            {
              ...defaultData,
              cardCompanyName: CardCompanyName.SHINHAN_CARD,
              cardSettlementGroupAt: '2023-11-09',
              salesGroupAt: '2023-11-06',
            },
          ],
        });

        // when
        const [firstRecord, secondRecord] = await service.todayDetails(
          user.id,
          todayDate,
        );

        // then
        expect(firstRecord.rowSpan).toBe(3);
        expect(secondRecord.rowSpan).toBe(0);
      });

      it('판매일 별 각 첫번째 데이터의 rowSpanForSalesGroupAt는 동일한 판매일을 가진 카드사별 데이터 갯수이다.', async () => {
        // given
        const todayDate = '2023-11-07';
        const defaultData = {
          prefundGroupAt: '2023-11-07',
          status: PrefundStatus.READY,
          userId: user.id,
        };
        await prisma.prefundByCard.createMany({
          data: [
            {
              ...defaultData,
              cardCompanyName: CardCompanyName.SHINHAN_CARD,
              cardSettlementGroupAt: '2023-11-09',
              salesGroupAt: '2023-11-06',
            },
            {
              ...defaultData,
              cardCompanyName: CardCompanyName.KB_CARD,
              cardSettlementGroupAt: '2023-11-10',
              salesGroupAt: '2023-11-06',
            },
            {
              ...defaultData,
              cardCompanyName: CardCompanyName.KB_CARD,
              cardSettlementGroupAt: '2023-11-10',
              salesGroupAt: '2023-11-05',
            },
          ],
        });

        // when
        const [firstPrefundByCard, SecondPrefundCard, thirdPrefundCard] =
          await service.todayDetails(user.id, todayDate);

        // then
        expect(firstPrefundByCard.rowSpanForSalesGroupAt).toBe(2);
        expect(SecondPrefundCard.rowSpanForSalesGroupAt).toBe(0);
        expect(thirdPrefundCard.rowSpanForSalesGroupAt).toBe(1);
      });
    });
  });

  describe('search', () => {
    it('선정산 차트 요약 정보가 정상적으로 리턴된다.', async () => {
      // given
      const startAt = '2023-11-05';
      const endAt = '2023-11-12';
      const defaultData = {
        status: PrefundStatus.READY,
        userId: user.id,
      };
      await prisma.prefundByCard.createMany({
        data: [
          {
            ...defaultData,
            prefundGroupAt: '2023-11-07',
            cardCompanyName: CardCompanyName.SHINHAN_CARD,
            cardSettlementGroupAt: '2023-11-10',
            salesGroupAt: '2023-11-06',
            setoff: -2000,
            serviceCommission: -20,
            cardCommission: -200,
            salesPrice: 20000,
          },
          {
            ...defaultData,
            prefundGroupAt: '2023-11-08',
            cardCompanyName: CardCompanyName.KB_CARD,
            cardSettlementGroupAt: '2023-11-11',
            salesGroupAt: '2023-11-07',
            setoff: 0,
            serviceCommission: -45,
            cardCommission: -450,
            salesPrice: 45000,
          },
          {
            ...defaultData,
            prefundGroupAt: '2023-11-09',
            cardCompanyName: CardCompanyName.KB_CARD,
            cardSettlementGroupAt: '2023-11-12',
            salesGroupAt: '2023-11-08',
            setoff: -5000,
            serviceCommission: -55,
            cardCommission: -550,
            salesPrice: 55000,
          },
        ],
      });
      await prisma.futureFund.createMany({
        data: [
          {
            futureFundType: FutureFundType.APPLY,
            fundGroupAt: '2023-11-06',
            userId: user.id,
            price: 0,
            applyPrice: 1_000_000,
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
            repaymentPrice: -16780,
            repaymentFees: -1000,
          },
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: '2023-11-08',
            userId: user.id,
            price: 983_220,
            accrualFees: 983,
            accumulatedFees: 983,
          },
          {
            futureFundType: FutureFundType.REPAYMENT,
            fundGroupAt: '2023-11-08',
            userId: user.id,
            repaymentPrice: -43522,
            repaymentFees: -983,
          },
          {
            futureFundType: FutureFundType.DAILY,
            fundGroupAt: '2023-11-09',
            userId: user.id,
            price: 939_698,
            accrualFees: 939,
            accumulatedFees: 939,
          },
          {
            futureFundType: FutureFundType.REPAYMENT,
            fundGroupAt: '2023-11-09',
            userId: user.id,
            repaymentPrice: -48456,
            repaymentFees: -939,
          },
        ],
      });

      // when
      const result = await service.search({ userId: user.id, startAt, endAt });

      // then
      expect(result).toEqual({
        dates: [
          '11.05',
          '11.06',
          '11.07',
          '11.08',
          '11.09',
          '11.10',
          '11.11',
          '11.12',
        ],
        data: [
          {
            name: 'setoff',
            values: [0, 0, -2000, 0, -5000, 0, 0, 0],
          },
          {
            name: 'serviceCommission',
            values: [0, 0, -20, -45, -55, 0, 0, 0],
          },
          {
            name: 'cardCommission',
            values: [0, 0, -200, -450, -550, 0, 0, 0],
          },
          {
            name: 'salesPrice',
            values: [0, 0, 20000, 45000, 55000, 0, 0, 0],
          },
          {
            name: 'repaymentPrice',
            values: [0, 0, -16780, -43522, -48456, 0, 0, 0],
          },
          {
            name: 'repaymentFees',
            values: [0, 0, -1000, -983, -939, 0, 0, 0],
          },
        ],
      });
    });
    it('선정산 차트 요약 정보가 없을 경우 정상적으로 리턴된다.', async () => {
      // given
      const startAt = '2023-11-05';
      const endAt = '2023-11-12';

      // when
      const result = await service.search({ userId: user.id, startAt, endAt });

      // then
      expect(result).toEqual({
        dates: [
          '11.05',
          '11.06',
          '11.07',
          '11.08',
          '11.09',
          '11.10',
          '11.11',
          '11.12',
        ],
        data: [
          {
            name: 'setoff',
            values: [0, 0, 0, 0, 0, 0, 0, 0],
          },
          {
            name: 'serviceCommission',
            values: [0, 0, 0, 0, 0, 0, 0, 0],
          },
          {
            name: 'cardCommission',
            values: [0, 0, 0, 0, 0, 0, 0, 0],
          },
          {
            name: 'salesPrice',
            values: [0, 0, 0, 0, 0, 0, 0, 0],
          },
          {
            name: 'repaymentPrice',
            values: [0, 0, 0, 0, 0, 0, 0, 0],
          },
          {
            name: 'repaymentFees',
            values: [0, 0, 0, 0, 0, 0, 0, 0],
          },
        ],
      });
    });
  });

  describe('searchDetail', () => {
    describe('선정산 차트 상세 정보 테스트', () => {
      it('정상적으로 응답된다.', async () => {
        // given
        const startAt = '2023-11-05';
        const endAt = '2023-11-12';
        const defaultData = {
          prefundGroupAt: '2023-11-07',
          status: PrefundStatus.DONE,
          userId: user.id,
        };
        await prisma.prefundByCard.createMany({
          data: [
            {
              ...defaultData,
              cardCompanyName: CardCompanyName.SHINHAN_CARD,
              cardSettlementGroupAt: '2023-11-09',
              salesGroupAt: '2023-11-06',
            },
          ],
        });

        // when
        const [record] = await service.searchDetails({
          userId: user.id,
          startAt,
          endAt,
        });

        // then
        expect(record).toEqual({
          approvalAmount: 0,
          cardCompanyName: '전체',
          children: [
            {
              approvalAmount: 0,
              cardCompanyName: '신한카드',
              commission: 0,
              date: '2023-11-07',
              preFundDate: null,
              preFundPrice: 0,
              rowSpanForSalesGroupAt: 1,
              salesGroupAt: '2023-11-06',
              serviceCommission: 0,
              setoff: 0,
              status: '완료',
            },
          ],
          commission: 0,
          date: '2023-11-07',
          key: 0,
          preFundDate: null,
          preFundPrice: 0,
          rowSpan: 2,
          salesGroupAt: '-',
          serviceCommission: 0,
          setoff: 0,
          status: '-',
        });
      });
      it('데이터가 없을 경우 정상적으로 응답된다.', async () => {
        // given
        const startAt = '2023-11-05';
        const endAt = '2023-11-12';

        // when
        const result = await service.searchDetails({
          userId: user.id,
          startAt,
          endAt,
        });

        // then
        expect(result).toEqual([]);
      });
    });
    describe('프론트 테이블 병합에 관련한 로직 테스트', () => {
      it('선정산일 별 조회 데이터가 2개일 경우 첫번째 레코드의 rowSpan은 전체 조회 수 + 1이다.', async () => {
        // given
        const startAt = '2023-11-05';
        const endAt = '2023-11-12';
        const defaultData = {
          prefundGroupAt: '2023-11-07',
          status: PrefundStatus.DONE,
          userId: user.id,
        };
        await prisma.prefundByCard.createMany({
          data: [
            {
              ...defaultData,
              cardCompanyName: CardCompanyName.SHINHAN_CARD,
              cardSettlementGroupAt: '2023-11-08',
              salesGroupAt: '2023-11-05',
            },
            {
              ...defaultData,
              cardCompanyName: CardCompanyName.SHINHAN_CARD,
              cardSettlementGroupAt: '2023-11-09',
              salesGroupAt: '2023-11-06',
            },
          ],
        });

        // when
        const [record] = await service.searchDetails({
          userId: user.id,
          startAt,
          endAt,
        });

        // then
        expect(record.rowSpan).toBe(3);
      });

      it('선정산일 별, 판매일 별 각 첫번째 데이터의 rowSpanForSalesGroupAt는 동일한 판매일을 가진 카드사별 데이터 갯수이다.', async () => {
        // given
        const startAt = '2023-11-05';
        const endAt = '2023-11-12';
        const defaultData = {
          status: PrefundStatus.DONE,
          userId: user.id,
        };
        await prisma.prefundByCard.createMany({
          data: [
            {
              ...defaultData,
              prefundGroupAt: '2023-11-07',
              cardCompanyName: CardCompanyName.SHINHAN_CARD,
              cardSettlementGroupAt: '2023-11-08',
              salesGroupAt: '2023-11-05',
            },
            {
              ...defaultData,
              prefundGroupAt: '2023-11-07',
              cardCompanyName: CardCompanyName.KB_CARD,
              cardSettlementGroupAt: '2023-11-09',
              salesGroupAt: '2023-11-05',
            },
            {
              ...defaultData,
              prefundGroupAt: '2023-11-06',
              cardCompanyName: CardCompanyName.SHINHAN_CARD,
              cardSettlementGroupAt: '2023-11-09',
              salesGroupAt: '2023-11-06',
            },
          ],
        });

        // when
        const [record] = await service.searchDetails({
          userId: user.id,
          startAt,
          endAt,
        });

        // then
        expect(record.children[0].rowSpanForSalesGroupAt).toBe(2);
      });
    });
  });

  describe('searchDetailV2', () => {
    describe('선정산 차트 상세 정보 테스트', () => {
      it('정상적으로 응답된다.', async () => {
        // given
        const startAt = '2023-11-11';
        const endAt = '2023-11-14';
        await prisma.prefundByCard.create({
          data: {
            prefundGroupAt: '2023-11-11',
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
        });
        await prisma.futureFund.createMany({
          data: [
            {
              fundGroupAt: '2023-11-10',
              userId: user.id,
              futureFundType: FutureFundType.APPLY,
              applyPrice: 1_000_000,
            },
            {
              futureFundType: FutureFundType.DAILY,
              fundGroupAt: '2023-11-11',
              userId: user.id,
              price: 1_000_000,
              accrualFees: 1_000,
              accumulatedFees: 1_000,
            },
            {
              futureFundType: FutureFundType.REPAYMENT,
              fundGroupAt: '2023-11-11',
              userId: user.id,
              repaymentFees: -1_000,
              repaymentPrice: -31_615,
            },
          ],
        });

        // when
        const [record] = await service.searchDetails2({
          userId: user.id,
          startAt,
          endAt,
        });

        // then
        expect(record).toEqual({
          prefundGroupAt: '2023-11-11',
          salesPrice: 35000,
          cardCommission: -350,
          serviceCommission: -35,
          setoff: -2000,
          prefundPrice: 32_615,
          repaymentFees: -1_000,
          repaymentPrice: -31_615,
          depositPrice: 0,
          applyFutureFund: 0,
          futureFund: 968_385,
        });
      });

      it('선정산 데이터는 존재하고 미래 정산이 없을 경우에도 정상적으로 응답된다.', async () => {
        // given
        const startAt = '2023-11-11';
        const endAt = '2023-11-14';
        await prisma.prefundByCard.create({
          data: {
            prefundGroupAt: '2023-11-11',
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
        });

        // when
        const [record] = await service.searchDetails2({
          userId: user.id,
          startAt,
          endAt,
        });

        // then
        expect(record).toEqual({
          prefundGroupAt: '2023-11-11',
          salesPrice: 35000,
          cardCommission: -350,
          serviceCommission: -35,
          setoff: -2000,
          prefundPrice: 32_615,
          repaymentFees: 0,
          repaymentPrice: 0,
          depositPrice: 32_615,
          applyFutureFund: 0,
          futureFund: 0,
        });
      });

      it('데이터가 없을 경우 정상적으로 응답된다.', async () => {
        // given
        const startAt = '2023-11-11';
        const endAt = '2023-11-14';

        // when
        const result = await service.searchDetails2({
          userId: user.id,
          startAt,
          endAt,
        });

        // then
        expect(result).toEqual([]);
      });
    });
  });
});
