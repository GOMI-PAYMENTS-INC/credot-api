import {
  EmailEmptyException,
  InvalidPasswordException,
  ExceedPhoneVerificationException,
  PhoneAuthDto,
  RequestPhoneAuthDto,
  VerifyPhoneAuthDto,
  RegisterDto,
  TokenDto,
  ExistDto,
  RequestExistDto,
  JwtPayload,
  SendTemporaryPasswordDto,
  LoginDto,
  ResetPasswordDto,
  AccountDto,
} from '@app/domain/auth';
import { UserDto } from '@app/domain/user';
import { CustomRedisService } from '@app/utils/cache';
import { NhnCloudService } from '@app/utils/nhn-cloud';
import { PrismaService } from '@app/utils/prisma';

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { add } from 'date-fns';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly redisService: CustomRedisService,
    private readonly nhnCloudService: NhnCloudService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
      },
    });
    if (!user) {
      throw new EmailEmptyException();
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new InvalidPasswordException();
    }

    return plainToInstance(UserDto, user);
  }

  async login({ email }: LoginDto): Promise<TokenDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
      },
    });
    const payload: JwtPayload = { email: user.email, id: user.id };
    return {
      isTemporaryPassword: false,
      accessToken: this.jwtService.sign(payload),
    };
  }

  async adminLogin({ email }: LoginDto): Promise<TokenDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
      },
    });
    if (user.role !== RoleType.ADMIN) {
      throw new UnauthorizedException('관리자 권한이 존재하지 않습니다.');
    }

    const payload: JwtPayload = { email: user.email, id: user.id };
    return {
      isTemporaryPassword: false,
      accessToken: this.jwtService.sign(payload),
    };
  }

  async exist(data: RequestExistDto): Promise<ExistDto> {
    const exist = await this.prisma.user.count({
      where: {
        email: data.email,
      },
    });

    const result = new ExistDto();
    result.existsUserEmail = !!exist;
    return plainToInstance(ExistDto, result);
  }

  async register(data: RegisterDto): Promise<TokenDto> {
    const verifyCode: string = await this.redisService.get(
      `${data.phone}_verify_code`,
    );
    if (!verifyCode) {
      throw new BadRequestException('인증번호가 만료되었습니다.');
    }

    if (verifyCode !== data.phoneVerifyCode) {
      throw new BadRequestException('인증번호가 유효하지 않습니다.');
    }

    const encryptedPassword = await bcrypt.hash(
      data.password,
      bcrypt.genSaltSync(),
    );
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        phoneNumber: data.phone,
        password: encryptedPassword,
      },
    });

    const payload: JwtPayload = { email: user.email, id: user.id };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async requestPhoneAuthCode({
    phoneNumber,
  }: RequestPhoneAuthDto): Promise<void> {
    const count = await this.redisService.get(phoneNumber);
    if (!count) {
      await this.redisService.set(phoneNumber, 0, 5 * 60);
    }

    if (count >= 5) {
      await this.redisService.expire(phoneNumber, 5 * 60);
      throw new ExceedPhoneVerificationException();
    }

    await this.prisma.$transaction(async (tx) => {
      const code = this.nhnCloudService.generateNumericToken(6);
      await tx.phoneVerification.create({
        data: {
          phoneNumber,
          code,
          expiredAt: add(new Date(), {
            minutes: 1,
            seconds: 30,
          }),
        },
      });
      const body = `[고미페이먼츠] 본인확인 인증번호를 입력해주세요. ${code}`;
      await this.nhnCloudService.sendSms(phoneNumber, body);
      await this.redisService.increment(phoneNumber, 1);
    });
  }

  async verifyPhoneAuthCode({
    phoneNumber,
    authCode,
  }: VerifyPhoneAuthDto): Promise<PhoneAuthDto> {
    return this.prisma.$transaction(async (tx) => {
      const phoneVerification = await tx.phoneVerification.findFirst({
        where: {
          phoneNumber,
          code: String(authCode),
          isVerified: false,
          expiredAt: {
            gte: new Date(),
          },
        },
      });

      if (!phoneVerification) {
        throw new BadRequestException('인증 번호가 만료되었습니다.');
      }

      await tx.phoneVerification.update({
        where: {
          id: phoneVerification.id,
        },
        data: {
          isVerified: true,
        },
      });

      const signatureNumber = this.nhnCloudService.generateStringToken(12);
      await this.redisService.set(
        `${phoneNumber}_verify_code`,
        signatureNumber,
        1000 * 60 * 10,
      );
      await this.redisService.del(phoneNumber);
      return plainToInstance(PhoneAuthDto, {
        verifyCodeSignatureNumber: signatureNumber,
      });
    });
  }

  async findAccounts({
    phoneNumber,
  }: VerifyPhoneAuthDto): Promise<AccountDto[]> {
    const users = await this.prisma.user.findMany({
      where: {
        phoneNumber,
      },
    });

    return plainToInstance(AccountDto, users);
  }

  async sendTemporaryPassword({
    email,
    phoneNumber,
    verifyCode,
  }: SendTemporaryPasswordDto): Promise<AccountDto> {
    const code: string = await this.redisService.get(
      `${phoneNumber}_verify_code`,
    );
    if (!code) {
      throw new BadRequestException('인증번호가 만료되었습니다.');
    }

    if (code !== verifyCode) {
      throw new BadRequestException('인증번호가 유효하지 않습니다.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        phoneNumber,
        email,
      },
    });
    if (!user) {
      throw new BadRequestException('존재하지 않는 유저입니다.');
    }

    return plainToInstance(AccountDto, user);
  }

  async resetPassword(data: ResetPasswordDto): Promise<UserDto> {
    const encryptedPassword = await bcrypt.hash(
      data.password,
      bcrypt.genSaltSync(),
    );

    const user = await this.prisma.user.update({
      data: {
        password: encryptedPassword,
      },
      where: {
        email: data.email,
      },
    });

    return plainToInstance(UserDto, user);
  }
}
