import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class SummaryPrefundDto {
  @Expose()
  salesPrice: number;

  @Expose()
  cardCommission: number;

  @Expose()
  serviceCommission: number;

  @Expose()
  setoff: number;

  @Expose()
  prefundPrice: number;

  @Expose()
  repaymentFees: number;

  @Expose()
  repaymentPrice: number;

  @Expose()
  depositPrice: number;
}
