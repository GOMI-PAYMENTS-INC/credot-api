import { CardInfoService } from '@app/domain/prefund';
import { PrismaService } from '@app/utils/prisma';

import { faker } from '@faker-js/faker';
import { Test, TestingModule } from '@nestjs/testing';
import { CardCompanyName, CrawlingType } from '@prisma/client';

describe('CardInfoService', () => {
  let service: CardInfoService;
  let prisma: PrismaService;

  let user;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, CardInfoService],
    }).compile();

    service = module.get<CardInfoService>(CardInfoService);
    prisma = module.get<PrismaService>(PrismaService);

    user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.internet.userName(),
      },
    });
  });

  afterEach(async () => {
    await prisma.cardInfos.deleteMany({
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

  describe('getBusinessDayStore', () => {
    it('생성된 카드 정보가 없으면 기본값 1일이 리턴 된다.', async () => {
      // given
      const type = CrawlingType.CREDIT_FINANCE;
      const userId = user.id;

      // when
      const result = await service.getBusinessDayStore({ type, userId });

      // then
      expect(result.SHINHAN_CARD).toBe(1);
    });

    it('정산일 3일인 신한카드 정보가 정상적으로 리턴 된다.', async () => {
      // given
      const type = CrawlingType.CREDIT_FINANCE;
      const userId = user.id;
      await prisma.cardInfos.create({
        data: {
          userId,
          type,
          cardCompanyName: CardCompanyName.SHINHAN_CARD,
          settlementCycle: 3,
        },
      });

      // when
      const result = await service.getBusinessDayStore({ type, userId });

      // then
      expect(result.SHINHAN_CARD).toBe(3);
    });
  });

  describe('getCardCommissionRateStore', () => {
    it('생성된 카드 정보가 없으면 체크카드, 신용카드 수수료가 0이 리턴 된다.', async () => {
      // given
      const type = CrawlingType.CREDIT_FINANCE;
      const userId = user.id;

      // when
      const result = await service.getCardCommissionRateStore({ type, userId });

      // then
      expect(result.SHINHAN_CARD.check).toBe(0);
      expect(result.SHINHAN_CARD.credit).toBe(0);
    });

    it('체크카드, 신용카드 수수료가 3%인 신한카드가 정상적으로 리턴된다.', async () => {
      // given
      const type = CrawlingType.CREDIT_FINANCE;
      const userId = user.id;
      await prisma.cardInfos.create({
        data: {
          userId,
          type,
          cardCompanyName: CardCompanyName.SHINHAN_CARD,
          creditCardRate: 0.03,
          checkCardRate: 0.03,
        },
      });

      // when
      const result = await service.getCardCommissionRateStore({ type, userId });

      // then
      expect(result.SHINHAN_CARD.credit).toBe(0.03);
      expect(result.SHINHAN_CARD.check).toBe(0.03);
    });
  });
});
