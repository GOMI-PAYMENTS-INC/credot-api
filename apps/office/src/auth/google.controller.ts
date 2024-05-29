import { GoogleService, RequestTokenDto } from '@app/domain/google';
import { CustomApiOperation, Roles } from '@app/utils/decorators';
import { RolesGuard } from '@app/utils/guards';

import { Controller, UseGuards, Post, Body, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('/google')
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {}
  @CustomApiOperation({
    summary: '토큰 요청',
    tags: ['google'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('/token')
  async requestToken(@Body() login: RequestTokenDto): Promise<boolean> {
    await this.googleService.requestToken(login);
    return true;
  }

  @CustomApiOperation({
    summary: '구글 인증 여부',
    tags: ['google'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/token')
  async validGoogleAuth(): Promise<boolean> {
    return await this.googleService.validGoogleAuth();
  }
}
