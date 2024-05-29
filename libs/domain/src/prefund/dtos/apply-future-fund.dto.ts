import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Matches } from 'class-validator';
import * as dayjs from 'dayjs';

export class ApplyFutureFundDto {
  @IsNumber()
  price: number;

  @ApiProperty({
    description: '미래 정산 신청 날짜',
    pattern: '\\d{4}-\\d{2}-\\d{2}',
    example: dayjs().format('YYYY-MM-DD'),
  })
  @Matches(RegExp(/^\d{4}-\d{2}-\d{2}$/))
  date: string;

  @IsNumber()
  userId: number;
}
