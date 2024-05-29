import { IsNumber, IsString } from 'class-validator';

export class RepaymentFutureFundDto {
  @IsNumber()
  repaymentPrice: number;

  @IsNumber()
  repaymentFees: number;

  @IsString()
  date: string;

  @IsNumber()
  userId: number;
}
