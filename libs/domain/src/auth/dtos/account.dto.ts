import { Exclude, Expose } from 'class-transformer';
import { IsEmail } from 'class-validator';

@Exclude()
export class AccountDto {
  @IsEmail()
  @Expose()
  email: string;
}
