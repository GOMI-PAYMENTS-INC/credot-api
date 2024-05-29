import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsString } from 'class-validator';

@Exclude()
export class TokenDto {
  @Expose()
  @IsString()
  accessToken: string;

  @Expose()
  @IsBoolean()
  isTemporaryPassword?: boolean;
}
