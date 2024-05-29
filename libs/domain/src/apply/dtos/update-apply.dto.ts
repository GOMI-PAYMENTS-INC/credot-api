import { EnumType } from '@app/utils/decorators';

import { ApplyStatus } from '@prisma/client';
import { IsEnum, IsNumber } from 'class-validator';

export class UpdateApplyDto {
  @IsEnum(ApplyStatus)
  @EnumType(ApplyStatus, 'ApplyStatusEnum')
  status: ApplyStatus;

  @IsNumber({}, { each: true })
  applyIds: number[];
}
