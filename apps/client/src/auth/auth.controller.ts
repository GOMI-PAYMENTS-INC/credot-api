import {
  AuthService,
  TokenDto,
  RegisterDto,
  LoginDto,
  ExistDto,
  SendTemporaryPasswordDto,
  AccountDto,
  ResetPasswordDto,
} from '@app/domain/auth';
import { UserDto } from '@app/domain/user';
import { CustomApiOperation } from '@app/utils/decorators';

import {
  Controller,
  UseGuards,
  Request,
  Post,
  Get,
  Body,
  Query,
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
    return this.authService.login(login);
  }

  @CustomApiOperation({
    summary: '프로필 조회',
    tags: ['auth'],
  })
  @ApiOkResponse({
    type: UserDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req: { user: UserDto }): Promise<UserDto> {
    return req.user;
  }

  @CustomApiOperation({
    summary: '회원가입',
    tags: ['auth'],
  })
  @ApiOkResponse({
    type: TokenDto,
  })
  @Post('register')
  async register(@Body() body: RegisterDto): Promise<TokenDto> {
    return this.authService.register(body);
  }

  @CustomApiOperation({
    summary: '이메일 존재하는지 검사',
    tags: ['auth'],
  })
  @ApiOkResponse({
    type: ExistDto,
  })
  @Get('exist')
  async existEmail(@Query('email') email: string): Promise<ExistDto> {
    return this.authService.exist({ email });
  }

  @CustomApiOperation({
    summary: '아이디 찾기',
    tags: ['auth'],
  })
  @ApiOkResponse({
    type: AccountDto,
    isArray: true,
  })
  @Get('/find-account')
  async findAccount(
    @Query('phoneNumber') phoneNumber: string,
    @Query('verifyCode') verifyCode: string,
  ): Promise<AccountDto[]> {
    return await this.authService.findAccounts({
      phoneNumber,
      authCode: verifyCode,
    });
  }

  @CustomApiOperation({
    summary: '임시 비밀번호 보내기',
    tags: ['auth'],
  })
  @ApiOkResponse({
    type: AccountDto,
  })
  @Post('/send-temporary-password')
  async sendTemporaryPassword(
    @Body() data: SendTemporaryPasswordDto,
  ): Promise<AccountDto> {
    return await this.authService.sendTemporaryPassword(data);
  }

  @CustomApiOperation({
    summary: '비밀번호 재설정',
    tags: ['auth'],
  })
  @ApiOkResponse({
    type: AccountDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('/reset-password')
  async resetPassword(@Body() data: ResetPasswordDto): Promise<UserDto> {
    return await this.authService.resetPassword(data);
  }
}
