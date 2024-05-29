import { AuthService } from '@app/domain/auth/auth.service';
import { UserDto } from '@app/domain/user/dtos/user.dto';

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<UserDto> {
    return await this.authService.validateUser(email, password);
  }
}
