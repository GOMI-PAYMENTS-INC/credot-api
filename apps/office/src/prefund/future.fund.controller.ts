import {
  ApplyFutureFundDto,
  ApplyFutureFundService,
  FutureFundService,
  TodayFutureFundDto,
} from '@app/domain/prefund';
import { FutureFundApplyDto } from '@app/domain/prefund/dtos/future-fund-apply.dto';
import { FutureFundDto } from '@app/domain/prefund/dtos/future-fund.dto';
import { RepaymentFutureFundDto } from '@app/domain/prefund/dtos/repayment-future-fund.dto';
import { UpdateFutureFundDto } from '@app/domain/prefund/dtos/update-future-fund.dto';
import { CustomApiOperation, Roles } from '@app/utils/decorators';
import { RolesGuard } from '@app/utils/guards';

import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { FutureFundStatus } from '@prisma/client';
import * as dayjs from 'dayjs';

@Controller('future-fund')
export class FutureFundController {
  constructor(
    private readonly futureFundService: FutureFundService,
    private readonly applyFutureFundService: ApplyFutureFundService,
  ) {}
  @CustomApiOperation({
    summary: '미래정산 요약',
    tags: ['futureFund'],
  })
  @ApiOkResponse({
    type: TodayFutureFundDto,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/today')
  async today(
    @Query('userId', ParseIntPipe) userId: number,
  ): Promise<TodayFutureFundDto> {
    return await this.futureFundService.today(
      dayjs().format('YYYY-MM-DD'),
      userId,
    );
  }

  @CustomApiOperation({
    summary: '미래정산 목록',
    tags: ['futureFund'],
  })
  @ApiOkResponse({
    type: FutureFundDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/list')
  async list(
    @Query('startAt', new DefaultValuePipe(dayjs().format('YYYY-MM-DD')))
    startAt: string, // YYYY-MM-DD
    @Query('endAt', new DefaultValuePipe(dayjs().format('YYYY-MM-DD')))
    endAt: string, // YYYY-MM-DD
    @Query('userId', ParseIntPipe) userId: number,
  ): Promise<FutureFundDto[]> {
    return await this.futureFundService.list({
      userId,
    });
  }

  @CustomApiOperation({
    summary: '미래정산 목록',
    tags: ['futureFund'],
  })
  @ApiOkResponse({
    type: FutureFundApplyDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/list/apply')
  async applyList(
    @Query('status') status: FutureFundStatus,
  ): Promise<FutureFundApplyDto[]> {
    return await this.applyFutureFundService.list({
      status,
    });
  }

  @CustomApiOperation({
    summary: '미래 정산 신청',
    tags: ['futureFund'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('apply/update')
  async updateApplyStatus(@Body() data: UpdateFutureFundDto): Promise<boolean> {
    await this.applyFutureFundService.updateStatus(data);
    return true;
  }

  @CustomApiOperation({
    summary: '미래 정산 신청',
    tags: ['futureFund'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('apply')
  async apply(@Body() data: ApplyFutureFundDto): Promise<boolean> {
    await this.futureFundService.apply(data);
    return true;
  }

  @CustomApiOperation({
    summary: '미래 정산 상환',
    tags: ['futureFund'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('repayment')
  async repayment(@Body() data: RepaymentFutureFundDto): Promise<boolean> {
    await this.futureFundService.manualRepayment(data);
    return true;
  }
}
