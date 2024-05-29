import { DomainModule } from '@app/domain';
import { envValidationSchema } from '@app/env.config';
import { getEnvName, UtilsModule } from '@app/utils';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApplyController } from './apply/apply.controller';
import { AuthController, AuthPhoneController } from './auth';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { FutureFundController } from './future-fund/future-fund.controller';
import { InterlockController } from './interlock/interlock.controller';
import { PrefundV2Controller } from './prefund/prefund-v2.controller';
import { PrefundController } from './prefund/prefund.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvName(),
      validationSchema: envValidationSchema,
    }),
    UtilsModule,
    DomainModule,
  ],
  controllers: [
    ClientController,
    AuthController,
    AuthPhoneController,
    InterlockController,
    PrefundController,
    ApplyController,
    PrefundV2Controller,
    FutureFundController,
  ],
  providers: [ClientService],
})
export class ClientModule {}
