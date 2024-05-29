import { BatchController } from '@app/batch/batch.controller';
import { BatchService } from '@app/batch/batch.service';
import { CreditFinanceBatch } from '@app/batch/credit-finance/credit-finance.batch';
import { DailyFutureFundBatch } from '@app/batch/future-fund/daily-future-fund.batch';
import { InnopayBatch } from '@app/batch/innopay/innopay.batch';
import { PrefundBatch } from '@app/batch/prefund/prefund.batch';
import { DomainModule } from '@app/domain';
import { envValidationSchema } from '@app/env.config';
import { getEnvName, UtilsModule } from '@app/utils';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SlackModule } from 'nestjs-slack';

@Module({
  imports: [
    SlackModule.forRoot({
      type: 'webhook',
      channels: [
        {
          name: 'CREDOT_ALARM',
          url: process.env.SLACK_ALARM_URL,
        },
      ],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvName(),
      validationSchema: envValidationSchema,
    }),
    UtilsModule,
    DomainModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [BatchController],
  providers: [
    BatchService,
    PrefundBatch,
    CreditFinanceBatch,
    InnopayBatch,
    DailyFutureFundBatch,
  ],
})
export class BatchModule {}
