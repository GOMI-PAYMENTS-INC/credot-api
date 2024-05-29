import { removeEscapeSequences } from '@app/utils';

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ApplyStatus } from '@prisma/client';

@Injectable()
export class ApplyStatusPipe implements PipeTransform {
  transform(value: any) {
    if (!value) {
      throw new BadRequestException('신청 상태를 입력해주세요.');
    }

    const unescapedValue = removeEscapeSequences(value);
    switch (unescapedValue) {
      case ApplyStatus.NEW_APPLY:
      case ApplyStatus.IN_BUSINESS:
      case ApplyStatus.IN_CONTRACT:
      case ApplyStatus.IN_HOLD:
        return unescapedValue;

      default:
        throw new BadRequestException('유효하지 않은 신청 상태입니다.');
    }
  }
}
