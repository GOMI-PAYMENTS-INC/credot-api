import { parsePrefundStatus } from '@app/utils';

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PrefundStatusPipe implements PipeTransform {
  transform(value: string) {
    if (!value) {
      throw new BadRequestException('선정산 상태를 입력해주세요.');
    }

    if (!['입금 준비중', '입금 완료', '거래 완료'].includes(value)) {
      throw new BadRequestException('유효하지 않은 선정산 상태입니다.');
    }

    return parsePrefundStatus(value);
  }
}
