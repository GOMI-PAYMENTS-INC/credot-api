import {
  CrawlingDto,
  CrawlingService,
  CrawlingStatusEnum,
  CreditFinanceApproveService,
  EasyshopDepositService,
  RequestCrawlingDto,
} from '@app/domain/crawling';
import { CustomApiOperation } from '@app/utils/decorators';

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { CrawlingType } from '@prisma/client';
import { customAlphabet } from 'nanoid';

@Controller('interlock')
export class InterlockController {
  constructor(
    private readonly easyshopService: EasyshopDepositService,
    private readonly creditFinanceApproveService: CreditFinanceApproveService,
    private readonly crawlingService: CrawlingService,
  ) {}

  @CustomApiOperation({
    summary: '채권 요청 조회',
    tags: ['interlock'],
  })
  @ApiOkResponse({
    type: CrawlingDto,
  })
  @Get('/:requestId')
  async getCrawling(
    @Param('requestId') requestId: string,
  ): Promise<CrawlingDto> {
    const parsedReqId =
      `${requestId}`.split(',').map((reqId) => Number(reqId)) || [];
    const results = await Promise.all(
      parsedReqId.map((reqId) => this.crawlingService.findById(reqId)),
    );
    const isAllSuccess = results.every(
      (item) => item.status === CrawlingStatusEnum.DONE,
    );
    const isFail = results.some(
      (item) => item.status === CrawlingStatusEnum.FAILED,
    );

    if (isAllSuccess) {
      return {
        id: 0,
        status: CrawlingStatusEnum.DONE,
      };
    }

    if (isFail) {
      return {
        id: 0,
        status: CrawlingStatusEnum.FAILED,
      };
    }

    return {
      id: 0,
      status: CrawlingStatusEnum.REQUEST,
    };
  }

  @CustomApiOperation({
    summary: '정산금 채권 조회',
    tags: ['interlock'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @Post('/check')
  async checkVanLogin(@Body() body: RequestCrawlingDto): Promise<boolean> {
    if (body.type === CrawlingType.EASYSHOP) {
      return await this.easyshopService.loginCheck({
        password: body.password,
        loginId: body.loginId,
        requestId: customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)(),
      });
    }

    if (body.type === CrawlingType.CREDIT_FINANCE) {
      return await this.creditFinanceApproveService.loginCheck({
        password: body.password,
        loginId: body.loginId,
        requestId: customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)(),
      });
    }

    return false;
  }
}
