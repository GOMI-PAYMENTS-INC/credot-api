import { Exclude, Expose } from 'class-transformer';
import { IsEmail } from 'class-validator';

@Exclude()
export class ExistDto {
  @Expose()
  existsUserEmail: boolean;
}

export class RequestExistDto {
  @IsEmail()
  email: string;
}
