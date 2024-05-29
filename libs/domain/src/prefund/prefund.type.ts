import {
  ApprovalType,
  CardCompanyName,
  CardType,
  PrefundStatus,
  VanType,
} from '@prisma/client';

export type BondType = {
  id: number;
  transactionAt: Date;
  affiliateStoreNumber: string;
  cardCompanyName: CardCompanyName;
  cardType: CardType;
  approvalType: ApprovalType;
  approvalNumber: string;
  approvalAmount: number;
  claimingResult: string;
  claimingAt: Date | null;
  installmentPeriod: string;
  vat: number;
  commission: number;
  depositAt: Date | null;
  depositAmount: number;
  terminalNumber: string;
  terminalName: string | null;
  vanType: VanType;
  userId: number;
  transactionId: string;
};

/*** 선정산 생성 시 ***/
export type CreateListByCardType = {
  [key in CardCompanyName]: {
    prefundGroupAt: string;
    cardSettlementGroupAt: string;
    salesGroupAt: string;
    status: PrefundStatus;
    cardCompanyName: CardCompanyName;
    userId: number;
    salesPrice: number;
    cardCommission: number;
    serviceCommission: number;
    setoff: number;
  };
};

export type PrefundRecordType = {
  prefundByCardId?: number;
  bondId: number;
  prefundGroupAt: string;
  status: PrefundStatus;
  approvalType: ApprovalType;
  approvalNumber: string;
  transactionId: string;
  cardCompanyName: CardCompanyName;
  salesPrice: number;
  transactionAt: Date;
  businessDay: number;
  cardCommission: number;
  serviceCommission: number;
  userId: number;
};

export type CalculateCardCommissionType = {
  salesPrice: number;
  commission: number;
  cardType: CardType; // 카드 타입
  cardRate: CardCommissionRateStoreItemType;
};

export type BusinessDayStoreType = {
  [key in CardCompanyName]: number;
};

export type ByBusinessDayStoreType = {
  [key in CardCompanyName]: boolean;
};

export type CardCommissionRateStoreType = {
  [key in CardCompanyName]: CardCommissionRateStoreItemType;
};

export type CardCommissionRateStoreItemType = { check: number; credit: number };

export type PrefundByCardsObjType = { [key in CardCompanyName]: number };

export type PrefundListFilterType = {
  status?: PrefundStatus;
  userId?: number;
  startAt?: string;
  endAt?: string;
};
