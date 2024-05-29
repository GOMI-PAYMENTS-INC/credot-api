import { FutureFundStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class FutureFundApplyDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  applyAt: string;

  @Expose()
  rejectReason: string | null;

  @Expose()
  status: FutureFundStatus;

  @Expose()
  limit: number;

  @Expose()
  futureFundPrice: number;

  @Expose()
  applyPrice: number;

  @Expose()
  avgSalesPrice: number;

  @Expose()
  avgSalesPriceRate: number;

  @Expose()
  count: number;

  @Expose()
  userId: number;
}
