import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TodayFutureFundDto {
  @Expose()
  futureFundInUse: number;

  @Expose()
  accumulatedFees: number;

  @Expose()
  applyPrice: number;

  @Expose()
  accrualFees: number;

  @Expose()
  repaymentPrice: number;

  @Expose()
  repaymentFees: number;

  @Expose()
  limit: number;
}
