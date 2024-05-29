import { DomainModule } from '@app/domain';
import { getEnvName, UtilsModule } from '@app/utils';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CardNumberConsumer } from './card-number';
import { ConsumerController } from './consumer.controller';
import { ConsumerService } from './consumer.service';
import {
  EasyshopSalesConsumer,
  EasyshopConsumer,
  CreditFinanceApprovalConsumer,
  CreditFinancePurchaseConsumer,
  CreditFinanceFullConsumer,
  CrawlingDefaultConsumer,
  InnopayConsumer,
} from './crawling';
import { envValidationSchema } from '../../../env.config';

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
  controllers: [ConsumerController],
  providers: [
    ConsumerService,
    EasyshopConsumer,
    EasyshopSalesConsumer,
    CreditFinanceApprovalConsumer,
    CreditFinancePurchaseConsumer,
    CreditFinanceFullConsumer,
    CardNumberConsumer,
    CrawlingDefaultConsumer,
    InnopayConsumer,
  ],
})
export class ConsumerModule {}
