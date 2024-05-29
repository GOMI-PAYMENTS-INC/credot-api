import { DomainModule } from '@app/domain';
import { envValidationSchema } from '@app/env.config';
import { getEnvName, UtilsModule } from '@app/utils';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SlackModule } from 'nestjs-slack';

import { ApplyController } from './apply/apply.controller';
import { AuthController } from './auth/auth.controller';
import { GoogleController } from './auth/google.controller';
import { OfficeController } from './office.controller';
import { OfficeService } from './office.service';
import { FutureFundController } from './prefund/future.fund.controller';
import { PrefundController } from './prefund/prefund.controller';
import { UploadController } from './upload/upload.controller';
import { UserController } from './user/user.controller';
import { HomeController } from './home/home.controller';

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
  ],
  controllers: [
    OfficeController,
    FutureFundController,
    AuthController,
    PrefundController,
    UserController,
    ApplyController,
    UploadController,
    GoogleController,
    HomeController,
  ],
  providers: [OfficeService],
})
export class OfficeModule {}
