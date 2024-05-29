import {
  PrefundDto,
  PrefundOfficeService,
  PrefundStatusEnum,
  SummaryPrefundDto,
  UpdatePrefundDto,
} from '@app/domain/prefund';
import { CustomApiOperation, Roles } from '@app/utils/decorators';
import { RolesGuard } from '@app/utils/guards';

import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import * as dayjs from 'dayjs';

@Controller('prefund')
export class PrefundController {
  constructor(private readonly prefundService: PrefundOfficeService) {}
  @CustomApiOperation({
    summary: '선정산 목록 추출',
    tags: ['prefund'],
  })
  @ApiOkResponse({
    type: PrefundDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/list')
  async getPrefunds(
    @Query('status') status: PrefundStatusEnum,
    @Query('startAt', new DefaultValuePipe(dayjs().format('YYYY-MM-DD')))
    startAt: string, // YYYY-MM-DD
    @Query('endAt', new DefaultValuePipe(dayjs().format('YYYY-MM-DD')))
    endAt: string, // YYYY-MM-DD
    @Query('userId') userId: string,
  ): Promise<PrefundDto[]> {
    return await this.prefundService.list({
      status,
      startAt,
      endAt,
      userId: userId && Number(userId),
    });
  }

  @CustomApiOperation({
    summary: '출금 준비 > 선정산 요약 정보',
    tags: ['prefund'],
  })
  @ApiOkResponse({
    type: SummaryPrefundDto,
    isArray: false,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/summary')
  async summary(
    @Query('date', new DefaultValuePipe(dayjs().format('YYYY-MM-DD')))
    date: string, // YYYY-MM-DD
    @Query('userId', ParseIntPipe) userId: number,
  ): Promise<SummaryPrefundDto> {
    return await this.prefundService.summary(date, userId);
  }

  @CustomApiOperation({
    summary: '선정산 상태 수정',
    tags: ['prefund'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Put('/')
  async updatePrefundStatusByIds(
    @Body() data: UpdatePrefundDto,
  ): Promise<boolean> {
    return this.prefundService.updatePrefundStatusByIds(
      data.prefundIds,
      data.status,
    );
  }
}
