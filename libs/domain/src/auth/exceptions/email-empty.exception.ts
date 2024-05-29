import { BadRequestException } from '@nestjs/common';

export class EmailEmptyException extends BadRequestException {
  constructor() {
    super('EMPTY_EMAIL');
  }
}
