import { RequestCrawlingDto, CrawlingResponseDto } from '@app/domain/crawling';
import {
  TodayPreFundDto,
  SearchPrefundDto,
  TodayPreFundSummaryDto,
  SearchDetailItemDto,
  PrefundService,
  PublicPrefundService,
} from '@app/domain/prefund';
import { UserDto } from '@app/domain/user';
import { CustomApiOperation } from '@app/utils/decorators';

import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import * as dayjs from 'dayjs';
import { customAlphabet } from 'nanoid';

@Controller('prefund')
export class PrefundController {
  constructor(
    private readonly prefundService: PrefundService,
    private readonly publicPrefundService: PublicPrefundService,
  ) {}

  @CustomApiOperation({
    summary: '정산금 채권 요청',
    tags: ['prefund'],
  })
  @ApiOkResponse({
    type: CrawlingResponseDto,
    isArray: true,
  })
  @Post('/request')
  async searchMyPrefund(
    @Body() body: RequestCrawlingDto,
  ): Promise<CrawlingResponseDto[]> {
    return await this.publicPrefundService.requestPublic(
      body,
      customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)(),
    );
  }

  @CustomApiOperation({
    summary: '정산금 채권 결과',
    tags: ['prefund'],
  })
  @ApiOkResponse({
    type: TodayPreFundSummaryDto,
  })
  @Post('/request/result')
  async myPrefund(
    @Query('crawlingId', ParseIntPipe) crawlingId: number,
  ): Promise<TodayPreFundSummaryDto> {
    return await this.publicPrefundService.myPrefund(crawlingId);
  }

  @CustomApiOperation({
    summary: '오늘 선정산금',
    tags: ['prefund'],
  })
  @ApiOkResponse({
    type: TodayPreFundSummaryDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('/today')
  async todayPreFund(
    @Request() req: { user: UserDto },
  ): Promise<TodayPreFundSummaryDto> {
    return this.prefundService.today(
      req.user.id,
      dayjs().add(9, 'hour').format('YYYY-MM-DD'),
    );
  }

  @CustomApiOperation({
    summary: '오늘 선정산금 상세',
    tags: ['prefund'],
  })
  @ApiOkResponse({
    type: TodayPreFundDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('/today/details')
  async todayPreFundDetails(
    @Request() req: { user: UserDto },
  ): Promise<TodayPreFundDto[]> {
    return this.prefundService.todayDetails(
      req.user.id,
      dayjs().add(9, 'hour').format('YYYY-MM-DD'),
    );
  }

  @CustomApiOperation({
    summary: '선정산금 기간 조회',
    tags: ['prefund'],
  })
  @ApiOkResponse({
    type: SearchPrefundDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('/search')
  async searchPrefund(
    @Query('startAt') startAt: string,
    @Query('endAt') endAt: string,
    @Request() req: { user: UserDto },
  ): Promise<SearchPrefundDto> {
    return await this.prefundService.search({
      startAt,
      endAt,
      userId: req.user.id,
    });
  }

  @CustomApiOperation({
    summary: '선정산금 기간 상세 LEGACY',
    tags: ['prefund'],
  })
  @ApiOkResponse({
    type: SearchDetailItemDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('/search/details')
  async searchDetails(
    @Query('startAt') startAt: string,
    @Query('endAt') endAt: string,
    @Request() req: { user: UserDto },
  ): Promise<SearchDetailItemDto[]> {
    return this.prefundService.searchDetails({
      startAt,
      endAt,
      userId: req.user.id,
    });
  }
}
