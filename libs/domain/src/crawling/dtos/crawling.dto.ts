import { CrawlingStatusEnum } from '@app/domain/crawling';
import { EnumType } from '@app/utils/decorators';

import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CrawlingDto {
  @Expose()
  id: number;

  @Expose()
  @EnumType(CrawlingStatusEnum, 'CrawlingStatusEnum')
  status: CrawlingStatusEnum;
}
