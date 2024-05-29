import { Injectable } from '@nestjs/common';

@Injectable()
export class OfficeService {
  getHello(): string {
    return 'Hello World!';
  }
}
