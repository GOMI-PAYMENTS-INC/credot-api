import { UserDto } from '@app/domain/user';

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.get('roles', context.getHandler());
    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserDto = request.user;
    return roles.includes(user?.role);
  }
}
