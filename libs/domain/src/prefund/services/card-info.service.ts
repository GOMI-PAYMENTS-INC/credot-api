import {
  BusinessDayStoreType,
  ByBusinessDayStoreType,
} from '@app/domain/prefund/';
import { PrismaService } from '@app/utils/prisma';

import { Injectable } from '@nestjs/common';
import { CardCompanyName, CrawlingType } from '@prisma/client';

type CardCommissionRateStoreItemType = { check: number; credit: number };

type CardCommissionRateStoreType = {
  [key in CardCompanyName]: CardCommissionRateStoreItemType;
};

@Injectable()
export class CardInfoService {
  constructor(private readonly prismaService: PrismaService) {}

  /***
   카드사별 정산일 목록 반환
   ***/
  async getBusinessDayStore({
    userId,
    type,
  }: {
    userId: number;
    type?: CrawlingType;
  }): Promise<BusinessDayStoreType> {
    const defaultBusinessDayStore = {
      [CardCompanyName.NH_CARD]: 1,
      [CardCompanyName.LOTTE_CARD]: 1,
      [CardCompanyName.BC_CARD]: 1,
      [CardCompanyName.SAMSUNG_CARD]: 1,
      [CardCompanyName.SHINHAN_CARD]: 1,
      [CardCompanyName.HANA_CARD]: 1,
      [CardCompanyName.HYUNDAE_CARD]: 1,
      [CardCompanyName.KB_CARD]: 1,
      [CardCompanyName.HDO_CARD]: 1,
      [CardCompanyName.CREDIT_CARD]: 1,
      [CardCompanyName.WOORI_CARD]: 1,
    };
    const cardInfos = await this.prismaService.cardInfos.findMany({
      where: {
        userId,
        ...(type && { type }),
      },
    });

    return {
      ...defaultBusinessDayStore,
      ...cardInfos.reduce(
        (acc, cur) => ({
          ...acc,
          [cur.cardCompanyName]: cur.settlementCycle,
        }),
        {},
      ),
    };
  }

  /***
   카드사별 정산일 목록 반환
   ***/
  async getByBusinessDayStore({
    userId,
    type,
  }: {
    userId: number;
    type?: CrawlingType;
  }): Promise<ByBusinessDayStoreType> {
    const defaultBusinessDayStore = {
      [CardCompanyName.NH_CARD]: true,
      [CardCompanyName.LOTTE_CARD]: true,
      [CardCompanyName.BC_CARD]: true,
      [CardCompanyName.SAMSUNG_CARD]: true,
      [CardCompanyName.SHINHAN_CARD]: true,
      [CardCompanyName.HANA_CARD]: true,
      [CardCompanyName.HYUNDAE_CARD]: true,
      [CardCompanyName.KB_CARD]: true,
      [CardCompanyName.HDO_CARD]: true,
      [CardCompanyName.CREDIT_CARD]: true,
      [CardCompanyName.WOORI_CARD]: true,
    };
    const cardInfos = await this.prismaService.cardInfos.findMany({
      where: {
        userId,
        ...(type && { type }),
      },
    });

    return {
      ...defaultBusinessDayStore,
      ...cardInfos.reduce(
        (acc, cur) => ({
          ...acc,
          [cur.cardCompanyName]: cur.byBusinessDay,
        }),
        {},
      ),
    };
  }

  async getCardCommissionRateStore({
    userId,
    type,
  }: {
    userId: number;
    type?: CrawlingType;
  }): Promise<CardCommissionRateStoreType> {
    const cardInfos = await this.prismaService.cardInfos.findMany({
      where: {
        userId,
        ...(type && { type }),
      },
    });

    const defaultList = Object.keys(CardCompanyName).reduce(
      (acc, curKey: CardCompanyName) => ({
        ...acc,
        [curKey]: {
          check: 0,
          credit: 0,
        },
      }),
      {} as CardCommissionRateStoreType,
    );

    return {
      ...defaultList,
      ...Object.values(cardInfos).reduce(
        (acc, cur) => ({
          ...acc,
          [cur.cardCompanyName]: {
            check: cur.checkCardRate.toNumber(),
            credit: cur.creditCardRate.toNumber(),
          },
        }),
        {},
      ),
    };
  }
}
