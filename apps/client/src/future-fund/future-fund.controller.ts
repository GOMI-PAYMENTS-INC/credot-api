import {
  ApplyFutureFundDto,
  ApplyFutureFundService,
  FutureFundApplyDto,
  FutureFundService,
  TodayFutureFundApplyDto,
  TodayFutureFundDto,
} from '@app/domain/prefund';
import { UserDto } from '@app/domain/user';
import { CustomApiOperation } from '@app/utils/decorators';

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import * as dayjs from 'dayjs';

@Controller('future-fund')
export class FutureFundController {
  constructor(
    private readonly futureFundService: FutureFundService,
    private readonly applyFutureFundService: ApplyFutureFundService,
  ) {}
  @CustomApiOperation({
    summary: '오늘 미래 정산',
    tags: ['future-fund'],
  })
  @ApiOkResponse({
    type: TodayFutureFundDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('/today')
  async todayFutureFund(
    @Request() req: { user: UserDto },
  ): Promise<TodayFutureFundDto> {
    return this.futureFundService.today(
      dayjs().add(9, 'hour').format('YYYY-MM-DD'),
      req.user.id,
    );
  }

  @CustomApiOperation({
    summary: '오늘 미래 정산 신청 조회',
    tags: ['future-fund'],
  })
  @ApiOkResponse({
    type: TodayFutureFundApplyDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('/today/apply')
  async todayFutureFundApply(
    @Request() req: { user: UserDto },
  ): Promise<TodayFutureFundApplyDto> {
    return this.futureFundService.findTodayApply(
      dayjs().add(9, 'hour').format('YYYY-MM-DD'),
      req.user.id,
    );
  }

  @CustomApiOperation({
    summary: '오늘 미래 정산 신청 조회',
    tags: ['future-fund'],
  })
  @ApiOkResponse({
    type: TodayFutureFundApplyDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Put('/today/cancel/:applyId')
  async cancelTodayFutureFund(
    @Param('applyId', ParseIntPipe) applyId: number,
  ): Promise<FutureFundApplyDto> {
    return this.applyFutureFundService.cancel(applyId);
  }

  @CustomApiOperation({
    summary: '오늘 미래 정산 신청',
    tags: ['future-fund'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('/apply')
  async applyFutureFund(
    @Request() req: { user: UserDto },
    @Body() body: ApplyFutureFundDto,
  ): Promise<boolean> {
    await this.applyFutureFundService.apply({
      userId: req.user.id,
      price: body.price,
      date: body.date,
    });
    return true;
  }
}
