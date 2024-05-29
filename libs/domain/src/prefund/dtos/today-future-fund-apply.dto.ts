import { EnumType } from '@app/utils/decorators';

import { FutureFundStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';
import { IsEnum } from 'class-validator';

@Exclude()
export class TodayFutureFundApplyDto {
  @Expose()
  id: number;

  @Expose()
  @IsEnum(FutureFundStatus)
  @EnumType(FutureFundStatus, 'FutureFundStatus')
  status: FutureFundStatus;

  @Expose()
  applyPrice: number;
}
