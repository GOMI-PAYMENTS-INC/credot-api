import { ApprovalType, CardType } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class BondDto {
  @Expose()
  id: number;

  @Expose()
  transactionId: string;

  @Expose()
  transactionAt: Date;

  @Expose()
  cardNumber: string;

  @Expose()
  cardCompanyName: string;

  @Expose()
  cardType: CardType;

  @Expose()
  approvalType: ApprovalType;

  @Expose()
  approvalAmount: number;

  @Expose()
  commission: number;
}
