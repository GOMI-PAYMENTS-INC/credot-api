import { Expose } from 'class-transformer';

@Expose()
export class HomeTodayDto {
  depositPrice: number;
  returnPrice: number;
}
