import {
  AuthService,
  PhoneAuthDto,
  RequestPhoneAuthDto,
} from '@app/domain/auth';
import { CustomApiOperation } from '@app/utils/decorators';

import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('/auth/phone')
export class AuthPhoneController {
  constructor(private readonly authService: AuthService) {}

  @CustomApiOperation({
    summary: '핸드폰 인증',
    tags: ['auth'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @Post('/request')
  async requestPhoneAuthCode(
    @Body() body: RequestPhoneAuthDto,
  ): Promise<boolean> {
    await this.authService.requestPhoneAuthCode(body);
    return true;
  }

  @CustomApiOperation({
    summary: '핸드폰 인증 번호 검증',
    tags: ['auth'],
  })
  @ApiOkResponse({
    type: PhoneAuthDto,
  })
  @Get('/verify')
  async verifyPhoneAuthCode(
    @Query('phoneNumber') phoneNumber: string,
    @Query('verifyCode') verifyCode: string,
  ): Promise<PhoneAuthDto> {
    return await this.authService.verifyPhoneAuthCode({
      phoneNumber,
      authCode: verifyCode,
    });
  }
}
