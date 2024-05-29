import { Expose } from 'class-transformer';

@Expose()
export class PrefundMatrixSummaryDto {
  totalDoneCount: number;
  totalPrefundAmount: number;
  totalReturnAmount: number;
  totalProfit: number;
  returnRate: number;
  avgReturnDate: number;
  avgProfitRate: number;
}

export class FutureFundMatrixSummaryDto {
  totalDoneCount: number;
  totalFutureFundAmount: number;
  totalReturnAmount: number;
  totalProfit: number;
}
