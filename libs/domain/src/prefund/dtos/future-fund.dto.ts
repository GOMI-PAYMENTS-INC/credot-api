import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class FutureFundDto {
  @Expose()
  fundGroupAt: string;

  @Expose()
  price: number;

  @Expose()
  applyPrice: number;

  @Expose()
  accrualFees: number;

  @Expose()
  accumulatedFees: number;

  @Expose()
  repaymentFees: number;

  @Expose()
  repaymentPrice: number;
}
