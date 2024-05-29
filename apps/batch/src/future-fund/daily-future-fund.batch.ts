import { FutureFundService } from '@app/domain/prefund';
import { PrismaService } from '@app/utils/prisma';

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as dayjs from 'dayjs';

@Injectable()
export class DailyFutureFundBatch {
  private readonly logger = new Logger(DailyFutureFundBatch.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly futureFundService: FutureFundService,
  ) {}

  /*** 미래 정산 데일리 처리 (한국시간 오전 3시 00분, UTC: 매일 오후 6시) ***/
  @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async daily() {
    const today = dayjs().add(9, 'h').format('YYYY-MM-DD');
    this.logger.log(`미래 정산 데일리 처리 - ${today}`);
    const users = await this.prisma.user.findMany({
      where: {
        NOT: {
          name: {
            startsWith: '조회_',
          },
        },
      },
    });

    try {
      await Promise.all(
        users.map((user) => this.futureFundService.calculate(user.id, today)),
      );
      this.logger.log(`미래 정산 데일리 처리 완료 - ${today}`);
    } catch (error) {
      this.logger.log(`미래 정산 데일리 처리 실패 - ${today}`);
      this.logger.error(error);
    }
  }
}
