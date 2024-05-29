import { BadRequestException } from '@nestjs/common';

export class ExceedPhoneVerificationException extends BadRequestException {
  constructor() {
    super('EXCEED_PHONE_VERIFICATION');
  }
}
