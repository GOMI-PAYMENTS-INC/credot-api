import { PrefundStatusEnum } from '@app/domain/prefund';
import { EnumType } from '@app/utils/decorators';

import { IsEnum, IsNumber } from 'class-validator';

export class UpdatePrefundDto {
  @IsEnum(PrefundStatusEnum)
  @EnumType(PrefundStatusEnum, 'PrefundStatusEnum')
  status: PrefundStatusEnum;

  @IsNumber({}, { each: true })
  prefundIds: number[];
}
