import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import * as dayjs from 'dayjs';

export class CreatePrefundDto {
  @ApiProperty({
    description: '선정산 날짜',
    pattern: '\\d{4}-\\d{2}-\\d{2}',
    example: dayjs().format('YYYY-MM-DD'),
  })
  @Matches(RegExp(/^\d{4}-\d{2}-\d{2}$/))
  @IsString()
  targetDate: string;

  userId: number;
}
