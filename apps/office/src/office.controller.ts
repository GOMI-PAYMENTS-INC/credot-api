import { CrawlingDto, CrawlingService } from '@app/domain/crawling';
import {
  ApplyFutureFundDto,
  BondDto,
  BondService,
  CreateBondDto,
  CreatePrefundDto,
  DailyPrefundService,
  FutureFundDto,
  FutureFundService,
  PrefundOfficeService,
} from '@app/domain/prefund';
import { CustomApiOperation } from '@app/utils/decorators';
import { PrismaService } from '@app/utils/prisma';
import { CrawlingQueueService, CrawlingQueueType } from '@app/utils/queue';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { CrawlingType, PrefundStatus } from '@prisma/client';
import * as dayjs from 'dayjs';
import { groupBy, sumBy } from 'lodash';
import { customAlphabet } from 'nanoid';
import { SlackService } from 'nestjs-slack';
import { Divider, Md, Message, Section } from 'slack-block-builder';

import { OfficeService } from './office.service';

@Controller()
export class OfficeController {
  private readonly logger = new Logger(OfficeController.name);

  constructor(
    private readonly officeService: OfficeService,
    private readonly crawlingService: CrawlingService,
    private readonly futureFundService: FutureFundService,
    private readonly bondService: BondService,
    private readonly dailyPrefundService: DailyPrefundService,
    private readonly prismaService: PrismaService,
    private crawlingQueueService: CrawlingQueueService,
    private slackService: SlackService,
    private prefundService: PrefundOfficeService,
  ) {}

  @Get()
  getHello(): string {
    return this.officeService.getHello();
  }

  @Get('/slack/future-fund')
  async slackFutureFund(): Promise<boolean> {
    await this.slackService.sendBlocks(
      Message()
        .blocks(
          Section().text(Md.bold(`미래정산금 신청 건이 발생했어요.`)),
          Section().text(
            Md.codeBlock(
              [
                `업체명 : test`,
                `한도 : 10,000,000 원`,
                `사용중 금액 : 2,000,000 원`,
                `신청 금액 : 8,000,000원`,
              ].join('\n'),
            ),
          ),
        )
        .getBlocks(),
      {
        channel: 'CREDOT_ALARM',
        icon_emoji: ':money_with_wings:',
      },
    );

    return true;
  }

  @Get('/slack/consult')
  async slackConsult(): Promise<boolean> {
    await this.slackService.sendBlocks(
      Message()
        .blocks(
          Section().text(Md.bold(`서비스 도입 문의가 발생했어요.`)),
          Section().text(
            Md.codeBlock(
              [
                `업체명 : XXXXX`,
                `담당자 : ㅇㅇㅇ / 대표`,
                `담당자 연락처 : 010-2988-6441`,
                `월 평균 매출 : 1,000,000원`,
              ].join('\n'),
            ),
          ),
        )
        .getBlocks(),
      {
        channel: 'CREDOT_ALARM',
        icon_emoji: ':love_letter:',
      },
    );

    return true;
  }

  @Get('/slack/profit')
  async slack(): Promise<boolean> {
    /* 지급 내역 */
    const prefundList = await this.prefundService.list({
      status: PrefundStatus.READY,
      startAt: dayjs().format('YYYY-MM-DD'),
      endAt: dayjs().format('YYYY-MM-DD'),
    });
    const prefundPrice = sumBy(prefundList, 'prefundPrice');
    const prefundCompanyCount = Object.keys(
      groupBy(prefundList, 'name'),
    ).length;
    const depositPrice = sumBy(prefundList, 'depositPrice');
    const repaymentPrice =
      sumBy(prefundList, 'repaymentFees') +
      sumBy(prefundList, 'repaymentPrice');

    /* 회수 내역 */
    const returnList = await this.prefundService.list({
      status: PrefundStatus.DEPOSIT_DONE,
      startAt: '2024-03-11',
      endAt: '2024-03-11',
    });
    const returnPrice = sumBy(returnList, 'cardSettlementPrice');
    const returnCount = Object.keys(groupBy(returnList, 'name')).length;

    /* 수익 */
    const prefundProfit = sumBy(returnList, 'serviceCommission');
    const futureFundProfit = sumBy(returnList, 'repaymentFees');

    await this.slackService.sendBlocks(
      Message()
        .blocks(
          Section().text(
            Md.bold(`[${dayjs().format('YYYY-MM-DD')} 크래닷 브리핑]`),
          ),
          Section().text(Md.blockquote('지급할 내역')),
          Section().text(
            Md.codeBlock(
              [
                `선정산 업체 수 : ${prefundCompanyCount} 개사`,
                `선정산 금액 : ${prefundPrice.toLocaleString()} 원`,
                `미래정산금 원금 및 수수료 상환 : ${repaymentPrice.toLocaleString()} 원`,
                `실제 입금액 : ${depositPrice.toLocaleString()} 원`,
              ].join('\n'),
            ),
          ),
          Divider(),
          Section().text(Md.blockquote('회수할 내역')),
          Section().text(
            Md.codeBlock(
              [
                `회수할 업체 수 : ${returnCount} 개사`,
                `회수할 금액 : ${returnPrice.toLocaleString()}원`,
              ].join('\n'),
            ),
          ),
          Divider(),
          Section().text(Md.blockquote('발생 수익')),
          Section().text(
            Md.codeBlock(
              [
                `선정산 수수료 수익 : ${prefundProfit.toLocaleString()}원`,
                `미래정산 수수료 수익 : ${futureFundProfit.toLocaleString()}원`,
                `총 수수료 수익 : ${(
                  futureFundProfit + prefundProfit
                ).toLocaleString()}원`,
              ].join('\n'),
            ),
          ),
          Divider(),
          Section().text(
            Md.blockquote(
              `오늘 필요한 금액  : ${(
                depositPrice - returnPrice
              ).toLocaleString()}원`,
            ),
          ),
        )
        .getBlocks(),
      {
        channel: 'CREDOT_ALARM',
        icon_emoji: ':money_with_wings:',
      },
    );

    return true;
  }

  @Get('/queue/failed')
  async queueList() {
    return await this.crawlingQueueService.failedQueueList();
  }

  @Get('/queue/delayed')
  async delayedQueueList() {
    return await this.crawlingQueueService.delayedQueueList();
  }

  @Get('/queue/active')
  async activeQueueList() {
    return await this.crawlingQueueService.activeQueueList();
  }

  @Get('/job/restart')
  async restartJob(@Query('jobId') jobId: string) {
    try {
      const job = await this.crawlingQueueService.job(jobId);
      if (!job) {
        return false;
      }
      await job.retry();
      return true;
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('/job/failed')
  async failedJob(@Query('jobId') jobId: string) {
    const job = await this.crawlingQueueService.job(jobId);
    await job.moveToFailed({
      message: '수동으로 실패 처리',
    });
  }

  @CustomApiOperation({
    summary: '채권 요청',
    tags: ['admin'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @Get('/request/bond')
  async test(
    @Query('userId', ParseIntPipe) userId: number,
  ): Promise<CrawlingDto | null> {
    const crawlingInfo = await this.prismaService.crawlingInfo.findFirst({
      where: {
        userId,
      },
    });
    if (!crawlingInfo) {
      return null;
    }
    8;

    return await this.crawlingService.request({
      password: crawlingInfo.password,
      loginId: crawlingInfo.accountId,
      crawlingQueueType:
        crawlingInfo.type === 'INNOPAY'
          ? CrawlingQueueType.INNOPAY
          : CrawlingQueueType.CREDIT_FINANCE_FULL,
      type: crawlingInfo.type,
      requestId: customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)(),
      userId,
      isBatch: false,
    });
  }

  @CustomApiOperation({
    summary: '채권 요청',
    tags: ['admin'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @Get('/request/bond/credit-finance/approved')
  async creditFinanceApproved(
    @Query('userId', ParseIntPipe) userId: number,
  ): Promise<CrawlingDto | null> {
    const crawlingInfo = await this.prismaService.crawlingInfo.findFirst({
      where: {
        userId,
        type: CrawlingType.CREDIT_FINANCE,
      },
    });
    if (!crawlingInfo) {
      return null;
    }

    return await this.crawlingService.request({
      password: crawlingInfo.password,
      loginId: crawlingInfo.accountId,
      crawlingQueueType: CrawlingQueueType.CREDIT_FINANCE_APPROVE,
      type: crawlingInfo.type,
      requestId: customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)(),
      userId,
      isBatch: false,
    });
  }

  @CustomApiOperation({
    summary: '채권 요청',
    tags: ['admin'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @Get('/request/bond/credit-finance/purchased')
  async creditFinancePurchased(
    @Query('userId', ParseIntPipe) userId: number,
  ): Promise<CrawlingDto | null> {
    const crawlingInfo = await this.prismaService.crawlingInfo.findFirst({
      where: {
        userId,
        type: CrawlingType.CREDIT_FINANCE,
      },
    });
    if (!crawlingInfo) {
      return null;
    }

    return await this.crawlingService.request({
      password: crawlingInfo.password,
      loginId: crawlingInfo.accountId,
      crawlingQueueType: CrawlingQueueType.CREDIT_FINANCE_PURCHASE,
      type: crawlingInfo.type,
      requestId: customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)(),
      userId,
      isBatch: false,
    });
  }

  @CustomApiOperation({
    summary: '수동 채권 생성',
    tags: ['admin'],
  })
  @ApiOkResponse({
    type: BondDto,
  })
  @Post('/create/bond')
  async manualBond(@Body() body: CreateBondDto): Promise<BondDto> {
    return await this.bondService.create(body);
  }

  @CustomApiOperation({
    summary: '선정산 생성',
    tags: ['admin'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @Post('/create/daily')
  async createDaily(@Body() body: CreatePrefundDto): Promise<boolean> {
    await this.dailyPrefundService.create({
      targetDate: body.targetDate,
      userId: body.userId,
    });

    return true;
  }

  @CustomApiOperation({
    summary: '특정일 수동 미래 정산 생성',
    tags: ['admin'],
  })
  @ApiOkResponse({
    type: FutureFundDto,
  })
  @Post('/create/future-fund')
  async manualFutureFund(
    @Body() body: ApplyFutureFundDto,
  ): Promise<FutureFundDto> {
    return await this.futureFundService.apply(body);
  }

  @CustomApiOperation({
    summary: '특정일 수동 미래 정산 처리',
    tags: ['admin'],
  })
  @ApiOkResponse({
    type: FutureFundDto,
  })
  @Post('/process/future-fund')
  async processFutureFund(
    @Body() body: CreatePrefundDto,
  ): Promise<FutureFundDto> {
    return await this.futureFundService.calculate(body.userId, body.targetDate);
  }

  @CustomApiOperation({
    summary: '선정산 요청',
    tags: ['admin'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @Get('/request/daily/prefund')
  async generatePrefundDaily(@Query('target') target: string) {
    const targetDate = target || dayjs().format('YYYY-MM-DD');
    this.logger.log(`데일리 선정산 시작 - targetDate: ${targetDate}`);
    try {
      const users = await this.prismaService.user.findMany({
        where: {
          NOT: {
            name: {
              startsWith: '조회_',
            },
          },
        },
      });
      if (!users.length) {
        this.logger.error(
          `데일리 선정산 유저 없음 - targetDate: ${targetDate}`,
        );
        return;
      }

      await users.reduce(
        (acc, user) =>
          acc.then(() =>
            this.dailyPrefundService
              .create({
                targetDate,
                userId: user.id,
              })
              .catch((error) => {
                throw error;
              }),
          ),
        Promise.resolve(),
      );

      this.logger.log(`데일리 선정산 완료 - targetDate: ${targetDate}`);
    } catch (error) {
      this.logger.error(JSON.stringify(error));
      this.logger.error(`데일리 선정산 오류 - targetDate: ${targetDate}`);
    }
  }
}
