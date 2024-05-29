import { IsBoolean, IsEmail, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @Length(11)
  @IsString()
  phone: string;

  @IsString()
  phoneVerifyCode: string;

  @IsBoolean()
  isMarketingOk: boolean;
}
