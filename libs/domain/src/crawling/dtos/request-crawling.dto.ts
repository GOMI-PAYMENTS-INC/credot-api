import { EnumType } from '@app/utils/decorators';

import { CrawlingType } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class RequestCrawlingDto {
  @IsString()
  loginId: string;

  @IsString()
  password: string;

  @IsEnum(CrawlingType)
  @EnumType(CrawlingType, 'CrawlingTypeEnum')
  type: CrawlingType;
}
