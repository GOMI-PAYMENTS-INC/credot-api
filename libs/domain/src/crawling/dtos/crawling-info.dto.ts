import { EnumType } from '@app/utils/decorators';

import { CardCompanyName, CrawlingType } from '@prisma/client';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class CrawlingInfoDto {
  @Expose()
  @EnumType(CrawlingType, 'CrawlingTypeEnum')
  type: CrawlingType;

  @Expose()
  accountId: string;

  @Expose()
  password: string;

  @Type(() => FranchiseInfo)
  @Expose()
  franchiseInfos: FranchiseInfo[];
}

@Exclude()
class FranchiseInfo {
  @Expose()
  id: number;

  @Expose()
  cardCompanyName: string;

  @Expose()
  franchiseNumber: string;
}
