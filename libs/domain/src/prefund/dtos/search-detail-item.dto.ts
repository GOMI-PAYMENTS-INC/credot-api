export class SearchDetailItemDto {
  key?: number;
  date: string;
  salesGroupAt: string;
  cardCompanyName: string;
  preFundPrice: number;
  status: string;
  rowSpan?: number;
  rowSpanForSalesGroupAt?: number;
  preFundDate: string;
  approvalAmount: number;
  commission: number;
  serviceCommission: number;
  setoff: number;
  children?: SearchDetailItemDto[];
}

export class SearchDetailItemDto2 {
  prefundGroupAt: string;
  salesPrice: number;
  cardCommission: number;
  serviceCommission: number;
  setoff: number;
  prefundPrice: number;
  repaymentFees: number;
  repaymentPrice: number;
  depositPrice: number;
  applyFutureFund: number;
  futureFund: number;
}
