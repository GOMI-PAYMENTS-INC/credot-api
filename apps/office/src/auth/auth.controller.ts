import { AuthService, TokenDto, LoginDto } from '@app/domain/auth';
import { UserDto } from '@app/domain/user';
import { CustomApiOperation, Roles } from '@app/utils/decorators';
import { RolesGuard } from '@app/utils/guards';

import {
  Controller,
  UseGuards,
  Request,
  Post,
  Get,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';

@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @CustomApiOperation({
    summary: '로그인',
    tags: ['auth'],
  })
  @ApiOkResponse({
    type: TokenDto,
  })
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Body() login: LoginDto): Promise<TokenDto> {
    return this.authService.adminLogin(login);
  }

  @CustomApiOperation({
    summary: '프로필 조회',
    tags: ['auth'],
  })
  @ApiOkResponse({
    type: UserDto,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('profile')
  async getProfile(@Request() req: { user: UserDto }): Promise<UserDto> {
    return req.user;
  }
}
