import { ApplyService } from '@app/domain/apply';
import { AuthService, JwtStrategy, LocalStrategy } from '@app/domain/auth';
import {
  CardClassificationService,
  CrawlingService,
  CreditFinanceApproveService,
  CreditFinanceCardInfoService,
  CreditFinancePurchaseService,
  EasyshopDepositService,
  EasyshopSalesService,
  InnopaySecondaryAuthService,
  InnopayService,
} from '@app/domain/crawling';
import { GoogleService } from '@app/domain/google';
import {
  PublicPrefundService,
  PrefundService,
  DailyPrefundService,
  CardInfoService,
  BondService,
  PrefundOfficeService,
  FutureFundService,
  ApplyFutureFundService,
} from '@app/domain/prefund';
import { UploadService } from '@app/domain/upload/';
import { UserService } from '@app/domain/user';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SlackModule } from 'nestjs-slack';
import * as process from 'process';

import { ChartService } from './chart/chart.service';

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
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRE },
    }),
  ],
  providers: [
    UserService,
    AuthService,
    LocalStrategy,
    JwtStrategy,
    EasyshopDepositService,
    CrawlingService,
    EasyshopSalesService,
    PrefundService,
    PrefundOfficeService,
    PublicPrefundService,
    DailyPrefundService,
    FutureFundService,
    ApplyFutureFundService,
    CardInfoService,
    CreditFinanceApproveService,
    CreditFinancePurchaseService,
    CreditFinanceCardInfoService,
    InnopaySecondaryAuthService,
    InnopayService,
    CardClassificationService,
    BondService,
    ApplyService,
    UploadService,
    GoogleService,
    ChartService,
  ],
  exports: [
    UserService,
    AuthService,
    LocalStrategy,
    JwtStrategy,
    EasyshopDepositService,
    CrawlingService,
    EasyshopSalesService,
    PrefundService,
    PrefundOfficeService,
    PublicPrefundService,
    DailyPrefundService,
    FutureFundService,
    CardInfoService,
    CreditFinanceApproveService,
    CreditFinancePurchaseService,
    CreditFinanceCardInfoService,
    InnopaySecondaryAuthService,
    InnopayService,
    BondService,
    CardClassificationService,
    ApplyService,
    ApplyFutureFundService,
    UploadService,
    GoogleService,
    ChartService,
  ],
})
export class DomainModule {}
