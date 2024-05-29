import {
  DailyPrefundService,
  FutureFundService,
  PrefundOfficeService,
} from '@app/domain/prefund';
import { PrismaService } from '@app/utils/prisma';

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrefundStatus } from '@prisma/client';
import * as dayjs from 'dayjs';
import { groupBy, sumBy } from 'lodash';
import { SlackService } from 'nestjs-slack';
import { Divider, Md, Message, Section } from 'slack-block-builder';

@Injectable()
export class PrefundBatch {
  private readonly logger = new Logger(PrefundBatch.name);

  constructor(
    private prisma: PrismaService,
    private dailyPrefundService: DailyPrefundService,
    private readonly prefundService: PrefundOfficeService,
    private readonly futureFundService: FutureFundService,
    private slackService: SlackService,
  ) {}

  private async prefundAlarm(targetDate: string) {
    /* 지급 내역 */
    const prefundList = await this.prefundService.list({
      status: PrefundStatus.READY,
      startAt: targetDate,
      endAt: targetDate,
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
      startAt: targetDate,
      endAt: targetDate,
    });
    const returnPrice = sumBy(returnList, 'cardSettlementPrice');
    const returnCount = Object.keys(groupBy(returnList, 'name')).length;

    /* 수익 */
    const prefundProfit = Math.abs(sumBy(returnList, 'serviceCommission'));
    const futureFundProfit = Math.abs(sumBy(prefundList, 'repaymentFees'));

    await this.slackService.sendBlocks(
      Message()
        .blocks(
          Section().text(Md.bold(`[${targetDate} 크래닷 브리핑]`)),
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
  }

  /*** 선정산 처리 (한국 시간: 오전 10시, UTC: 자정 1시) ***/
  @Cron('0 1 * * *')
  async generatePrefundDaily() {
    const targetDate = dayjs().format('YYYY-MM-DD');
    this.logger.log(`데일리 선정산 배치 시작 - targetDate: ${targetDate}`);
    try {
      const users = await this.prisma.user.findMany({
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
          acc
            .then(async () => {
              await this.dailyPrefundService.create({
                targetDate,
                userId: user.id,
              });
            })
            .catch((error) => {
              throw error;
            }),
        Promise.resolve(),
      );
      this.logger.log(`데일리 선정산 배치 완료 - targetDate: ${targetDate}`);
      await this.prefundAlarm(targetDate);
    } catch (error) {
      this.logger.error(JSON.stringify(error));
      this.logger.error(`데일리 선정산 배치 오류 - targetDate: ${targetDate}`);
    }
  }
}
