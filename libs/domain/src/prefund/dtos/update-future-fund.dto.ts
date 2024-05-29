import { EnumType } from '@app/utils/decorators';

import { FutureFundStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateFutureFundDto {
  ids: number[];
  @IsEnum(FutureFundStatus)
  @EnumType(FutureFundStatus, 'FutureFundStatus')
  status: FutureFundStatus;
}
