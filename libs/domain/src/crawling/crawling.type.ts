import { ApprovalType, CardCompanyName, CardType } from '@prisma/client';

export class CrawlingDataType {
  filePath?: string;
  userId?: number;
  requestId: string;
  loginId: string;
  password: string;
}

export type BondRecordType = {
  transactionId: string;
  transactionAt: Date;
  cardNumber: string;
  cardCompanyName: CardCompanyName;
  cardType: CardType;
  approvalType: ApprovalType;
  approvalNumber: string;
  approvalAmount: number;
  originalCardCompanyName: string;
  userId: number;
  depositAt?: Date;
  depositAmount?: number;
  purchaseAt?: Date;
  commission?: number;
  installmentPeriod?: string;
};
