import { HomeChartDto, HomeTodayDto } from '@app/apps/office/src/home/dtos';
import {
  HomeInoutDto,
  HomeInoutInDto,
} from '@app/apps/office/src/home/dtos/home.inout.dto';
import { ChartService } from '@app/domain/chart/chart.service';
import { FutureFundService, PrefundOfficeService } from '@app/domain/prefund';
import {
  FutureFundMatrixSummaryDto,
  PrefundMatrixSummaryDto,
} from '@app/domain/prefund/dtos/prefund-matrix-summary.dto';
import { CustomApiOperation, Roles } from '@app/utils/decorators';
import { RolesGuard } from '@app/utils/guards';

import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { PrefundStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import * as dayjs from 'dayjs';
import { groupBy, sortBy, sumBy } from 'lodash';

export type ChartType =
  | 'PROFIT'
  | 'ACTIVE_USER'
  | 'PREFUND'
  | 'FUTURE_FUND'
  | 'GMV';
export type ChartDataType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

@Controller('home')
export class HomeController {
  constructor(
    private readonly prefundService: PrefundOfficeService,
    private readonly futureFundService: FutureFundService,
    private readonly chartService: ChartService,
  ) {}

  @CustomApiOperation({
    summary: '오늘의 입출금 업무',
    tags: ['home'],
  })
  @ApiOkResponse({
    type: HomeTodayDto,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/today')
  async today(): Promise<HomeTodayDto> {
    const today = dayjs().add(9, 'hour').format('YYYY-MM-DD');
    const prefundList = await this.prefundService.list({
      status: PrefundStatus.READY,
      startAt: today,
      endAt: today,
    });

    const returnList = await this.prefundService.list({
      status: PrefundStatus.DEPOSIT_DONE,
      startAt: today,
      endAt: today,
    });

    // 지급해야할 내역
    const prefundPrice = sumBy(prefundList, 'prefundPrice');
    // 회수해야할 내역
    const returnPrice = sumBy(returnList, 'cardSettlementPrice');

    return plainToInstance(HomeTodayDto, {
      depositPrice: prefundPrice,
      returnPrice,
    });
  }

  @CustomApiOperation({
    summary: '자금 IN & OUT',
    tags: ['home'],
  })
  @ApiOkResponse({
    type: HomeInoutDto,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/inout/out')
  async inOutOut(): Promise<HomeInoutDto> {
    const today = dayjs().add(9, 'hour').format('YYYY-MM-DD');
    const futureFundList = await this.futureFundService.list({
      startAt: today,
      endAt: today,
    });

    const prefundList = await this.prefundService.list({
      status: PrefundStatus.DEPOSIT_DONE,
    });

    // 선정산 지급액
    const prefundPrice =
      sumBy(prefundList, 'prefundPrice') + sumBy(prefundList, 'repaymentFees');

    // 미래정산 지급액
    const futureFundPrice =
      sumBy(futureFundList, 'price') + sumBy(futureFundList, 'applyPrice');

    return plainToInstance(HomeInoutDto, {
      prefundPrice,
      futureFundPrice,
    });
  }

  @CustomApiOperation({
    summary: '자금 IN & OUT',
    tags: ['home'],
  })
  @ApiOkResponse({
    type: HomeInoutInDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/inout/in')
  async inOutIn(): Promise<HomeInoutInDto[]> {
    const prefundList = await this.prefundService.list({
      status: PrefundStatus.DEPOSIT_DONE,
    });
    const groupByCardSettlementAt = groupBy(
      prefundList,
      (item) => item.cardSettlementGroupAt,
    );

    return plainToInstance(
      HomeInoutInDto,
      sortBy(
        Object.keys(groupByCardSettlementAt).map((key) => {
          const list = groupByCardSettlementAt[key];
          return {
            date: key,
            returnPrice: sumBy(list, 'cardSettlementPrice'),
          };
        }),
        'date',
      ),
    );
  }

  @CustomApiOperation({
    summary: '선정산 주요 지표',
    tags: ['home'],
  })
  @ApiOkResponse({
    type: PrefundMatrixSummaryDto,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/summary/prefund')
  async prefundSummary(): Promise<PrefundMatrixSummaryDto> {
    return await this.prefundService.matrixSummary();
  }

  @CustomApiOperation({
    summary: '미래정산 주요 지표',
    tags: ['home'],
  })
  @ApiOkResponse({
    type: FutureFundMatrixSummaryDto,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/summary/future-fund')
  async futureFundSummary(): Promise<FutureFundMatrixSummaryDto> {
    return await this.futureFundService.matrixSummary();
  }

  @CustomApiOperation({
    summary: '홈 차트',
    tags: ['home'],
  })
  @ApiOkResponse({
    type: HomeChartDto,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/chart')
  async chart(
    @Query('type') type: ChartType,
    @Query('dateType') dateType: ChartDataType,
    @Query('startAt', new DefaultValuePipe(dayjs().format('YYYY-MM-DD')))
    startAt: string, // YYYY-MM-DD
    @Query('endAt', new DefaultValuePipe(dayjs().format('YYYY-MM-DD')))
    endAt: string, // YYYY-MM-DD
    @Query('userId', ParseIntPipe) userId?: number,
  ): Promise<HomeChartDto> {
    const chartStore: {
      [key in ChartType]: () => Promise<HomeChartDto>;
    } = {
      PROFIT: async () => this.chartService.profit(dateType, startAt, endAt),
      ACTIVE_USER: async () =>
        this.chartService.activeUser(dateType, startAt, endAt),
      PREFUND: async () => this.chartService.prefund(dateType, startAt, endAt),
      FUTURE_FUND: async () =>
        this.chartService.futureFund(dateType, startAt, endAt),
      GMV: async () => this.chartService.gmv(dateType, startAt, endAt),
    };

    const data = await chartStore[type]();
    console.log(type, dateType, startAt, endAt, userId);
    return plainToInstance(HomeChartDto, data);
  }
}
