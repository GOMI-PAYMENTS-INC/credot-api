import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PrefundDto {
  @Expose()
  id: number;

  @Expose()
  prefundGroupAt: string;

  @Expose()
  salesGroupAt: string;

  @Expose()
  cardCompanyName: string;

  @Expose()
  status: string;

  @Expose()
  salesPrice: number;

  @Expose()
  cardCommission: number;

  @Expose()
  serviceCommission: number;

  @Expose()
  setoff: number;

  @Expose()
  cardSettlementGroupAt: string;

  @Expose()
  prefundAt: string;

  @Expose()
  depositAt: string;

  /*** User Info ***/
  @Expose()
  name: string;

  @Expose()
  repaymentFees: number;

  @Expose()
  repaymentPrice: number;

  @Expose()
  cardSettlementPrice: number;

  @Expose()
  prefundPrice: number;

  @Expose()
  depositPrice: number;
}
