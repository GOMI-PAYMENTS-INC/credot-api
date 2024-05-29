import { Expose } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class CrawlingResponseDto {
  @Expose()
  @IsNumber()
  crawlingId: number;
}
