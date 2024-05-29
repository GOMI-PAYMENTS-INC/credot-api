import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';

export class RequestPhoneAuthDto {
  @Length(11)
  @IsString()
  phoneNumber: string;
}

export class VerifyPhoneAuthDto {
  @Length(11)
  @IsString()
  phoneNumber: string;

  @Length(6)
  @IsString()
  authCode: string;
}

@Exclude()
export class PhoneAuthDto {
  @Expose()
  @IsString()
  verifyCodeSignatureNumber: string;
}

export class SendTemporaryPasswordDto {
  @IsEmail()
  email: string;

  @Length(11)
  @IsString()
  phoneNumber: string;

  @IsString()
  verifyCode: string;
}
