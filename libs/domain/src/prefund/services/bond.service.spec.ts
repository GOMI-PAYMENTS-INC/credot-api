import { BondService, CreateBondDto } from '@app/domain/prefund';
import { exposeCardCompanyName } from '@app/utils';
import { PrismaService } from '@app/utils/prisma';

import { faker } from '@faker-js/faker';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ApprovalType,
  Bond,
  CardCompanyName,
  CardType,
  PrefundStatus,
} from '@prisma/client';
import * as dayjs from 'dayjs';

describe('BondService', () => {
  let service: BondService;
  let prisma: PrismaService;

  let user;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, BondService],
    }).compile();

    service = module.get<BondService>(BondService);
    prisma = module.get<PrismaService>(PrismaService);

    user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.internet.userName(),
      },
    });
  });

  afterEach(async () => {
    await prisma.prefund.deleteMany({
      where: {
        userId: user.id,
      },
    });
    await prisma.prefundByCard.deleteMany({
      where: {
        userId: user.id,
      },
    });
    await prisma.bond.deleteMany({
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

  describe('getBondList', () => {
    it('12월 12일 7시에 발생한 NH농협카드 매출에 대하여 12월 13일 선정산 대상의 채권으로 가져온다.', async () => {
      // given
      const approvalNumber = faker.string.uuid();
      const transactionId = faker.string.uuid();
      await prisma.bond.create({
        data: {
          transactionAt: new Date('2023-12-12 19:23:39.000'),
          cardNumber: faker.finance.creditCardNumber({
            issuer: '5424-##*-*-*',
          }),
          userId: user.id,
          cardCompanyName: CardCompanyName.NH_CARD,
          cardType: CardType.CREDIT,
          approvalType: ApprovalType.APPROVED,
          approvalNumber,
          approvalAmount: 70000,
          transactionId,
          originalCardCompanyName: exposeCardCompanyName(
            CardCompanyName.NH_CARD,
          ),
        },
      });
      const endDate = dayjs('2023-12-13 23:59:59');
      const userId = user.id;

      // when
      const [prefundBond] = await service.getBondList({ endDate, userId }, {});

      // then
      expect(prefundBond.transactionId).toBe(transactionId);
    });

    it('12월 12일 7시에 NH농협카드 매출이 발생 후 5분 후 취소되었을 때 12월 13일 선정산 대상의 채권으로 가져오지 않는다.', async () => {
      // given
      const approvalNumber = faker.string.uuid();
      await prisma.bond.createMany({
        data: [
          {
            transactionAt: new Date('2023-12-12 19:23:39.000'),
            cardNumber: faker.finance.creditCardNumber({
              issuer: '5424-##*-*-*',
            }),
            userId: user.id,
            cardCompanyName: CardCompanyName.NH_CARD,
            cardType: CardType.CREDIT,
            approvalType: ApprovalType.APPROVED,
            approvalNumber,
            approvalAmount: 70000,
            transactionId: faker.string.uuid(),
            originalCardCompanyName: exposeCardCompanyName(
              CardCompanyName.NH_CARD,
            ),
          },
          {
            transactionAt: new Date('2023-12-12 19:28:39.000'),
            cardNumber: faker.finance.creditCardNumber({
              issuer: '5424-##*-*-*',
            }),
            userId: user.id,
            cardCompanyName: CardCompanyName.NH_CARD,
            cardType: CardType.CREDIT,
            approvalType: ApprovalType.CANCEL,
            approvalNumber,
            approvalAmount: -70000,
            transactionId: faker.string.uuid(),
            originalCardCompanyName: exposeCardCompanyName(
              CardCompanyName.NH_CARD,
            ),
          },
        ],
      });
      const endDate = dayjs('2023-12-13 23:59:59');
      const userId = user.id;

      // when
      const bondList = await service.getBondList({ endDate, userId }, {});

      // then
      expect(bondList.length).toBe(0);
    });
  });

  describe('getSetoffBondList', () => {
    it('12월 10일에 채권이 발생했고, 12월 11일에 선정산 처리된 채권에 대하여 12일에 취소가 되었을 때 12월 13일 선정산 대상의 상계로 가져온다.', async () => {
      // given
      const prefundApprovalNumber = faker.string.uuid();
      const prefundTransactionId = faker.string.uuid();
      const cancelTransactionId = faker.string.uuid();
      // 10일에 매출 발생
      const bond = await prisma.bond.create({
        data: {
          transactionAt: new Date('2023-12-10 19:23:39.000'),
          cardNumber: faker.finance.creditCardNumber({
            issuer: '5424-##*-*-*',
          }),
          userId: user.id,
          cardCompanyName: CardCompanyName.NH_CARD,
          cardType: CardType.CREDIT,
          approvalType: ApprovalType.APPROVED,
          approvalNumber: prefundApprovalNumber,
          approvalAmount: 70000,
          transactionId: prefundTransactionId,
          originalCardCompanyName: exposeCardCompanyName(
            CardCompanyName.NH_CARD,
          ),
        },
      });

      // 11일에 선정산 진행
      const prefundByCard = await prisma.prefundByCard.create({
        data: {
          userId: user.id,
          cardCompanyName: CardCompanyName.NH_CARD,
          prefundGroupAt: '2023-12-11',
          status: PrefundStatus.DEPOSIT_DONE,
          salesPrice: 70000,
          cardCommission: -1050,
          serviceCommission: -137,
          salesGroupAt: '2023-12-10',
          cardSettlementGroupAt: '2023-12-13',
        },
      });
      await prisma.prefund.create({
        data: {
          bondId: bond.id,
          prefundByCardId: prefundByCard.id,
          transactionAt: new Date('2023-12-11 19:23:39.000'),
          userId: user.id,
          cardCompanyName: CardCompanyName.NH_CARD,
          prefundGroupAt: '2023-12-11',
          status: PrefundStatus.DEPOSIT_DONE,
          approvalType: ApprovalType.APPROVED,
          approvalNumber: prefundApprovalNumber,
          salesPrice: 70000,
          cardCommission: -1050,
          serviceCommission: -137,
          transactionId: prefundTransactionId,
          businessDay: 2,
          originalBusinessDay: 3,
          originalCardCompanyName: exposeCardCompanyName(
            CardCompanyName.NH_CARD,
          ),
        },
      });

      // 12일에 취소 진행
      await prisma.bond.create({
        data: {
          transactionAt: new Date('2023-12-12 19:23:39.000'),
          cardNumber: faker.finance.creditCardNumber({
            issuer: '5424-##*-*-*',
          }),
          userId: user.id,
          cardCompanyName: CardCompanyName.NH_CARD,
          cardType: CardType.CREDIT,
          approvalType: ApprovalType.CANCEL,
          approvalNumber: prefundApprovalNumber,
          approvalAmount: -70000,
          transactionId: cancelTransactionId,
          originalCardCompanyName: exposeCardCompanyName(
            CardCompanyName.NH_CARD,
          ),
        },
      });
      const endDate = dayjs('2023-12-13 23:59:59');
      const userId = user.id;

      // when
      const [setoffBond] = await service.getSetoffBondList(
        { endDate, userId },
        {},
      );

      // then
      expect(setoffBond.transactionId).toBe(cancelTransactionId);
    });
  });

  describe('createManualBond', () => {
    it('2023.12.28에 신한카드에서 발생한 수동 채권을 정상적으로 생성한다.', async () => {
      // given
      const bond = new CreateBondDto();
      bond.userId = user.id;
      bond.transactionAt = new Date('2023-12-28 13:23:00');
      bond.approvalAmount = 30_000;
      bond.commission = 0;
      bond.cardCompanyName = CardCompanyName.SHINHAN_CARD;
      bond.cardType = CardType.CREDIT;
      bond.approvalType = ApprovalType.APPROVED;
      bond.approvalNumber = 'TEST_100';

      // when
      const { id, ...leftover } = await service.create(bond);

      // then
      expect(leftover).toEqual({
        approvalAmount: 30000,
        approvalType: 'APPROVED',
        cardCompanyName: 'SHINHAN_CARD',
        transactionId: '2023-12-28-APPROVED-TEST_100-30000',
        cardNumber: null,
        cardType: 'CREDIT',
        commission: 0,
        transactionAt: new Date('2023-12-28 13:23:00'),
      });
    });
  });
});
