import { ApplyFutureFundDto, FutureFundService } from '@app/domain/prefund';
import { FutureFundApplyDto } from '@app/domain/prefund/dtos/future-fund-apply.dto';
import { UpdateFutureFundDto } from '@app/domain/prefund/dtos/update-future-fund.dto';
import { PrismaService } from '@app/utils/prisma';

import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { FutureFundStatus, PrismaClient } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import * as dayjs from 'dayjs';
import { SlackService } from 'nestjs-slack';
import { Md, Message, Section } from 'slack-block-builder';

@Injectable()
export class ApplyFutureFundService {
  private readonly logger = new Logger(ApplyFutureFundService.name);

  constructor(
    private prismaService: PrismaService,
    @Inject(forwardRef(() => FutureFundService))
    private readonly futureFundService: FutureFundService,
    private slackService: SlackService,
  ) {}

  async list({
    status,
  }: {
    status: FutureFundStatus;
  }): Promise<FutureFundApplyDto[]> {
    const today = dayjs().add(9, 'h').format('YYYY-MM-DD');
    const result = await this.prismaService.futureFundApply.findMany({
      where: {
        ...(status === FutureFundStatus.READY && { applyAt: today }),
        status,
      },
      include: {
        User: true,
      },
      orderBy: {
        applyAt: 'desc',
      },
    });

    return plainToInstance(
      FutureFundApplyDto,
      result.map((item) => ({
        ...item,
        avgSalesPriceRate: item.avgSalesPriceRate.toNumber(),
        name: item.User.name,
      })),
    );
  }

  async cancel(id: number): Promise<FutureFundApplyDto> {
    const result = await this.prismaService.futureFundApply.update({
      where: {
        id,
      },
      data: {
        status: FutureFundStatus.CANCEL,
      },
      include: {
        User: true,
      },
    });

    return plainToInstance(FutureFundApplyDto, {
      ...result,
      avgSalesPriceRate: result.avgSalesPriceRate.toNumber(),
      name: result.User.name,
    });
  }

  async apply(
    { userId, date, price }: ApplyFutureFundDto,
    {
      tx,
    }: {
      tx?: Omit<
        PrismaClient,
        | '$connect'
        | '$disconnect'
        | '$on'
        | '$transaction'
        | '$use'
        | '$extends'
      >;
    } = {},
  ): Promise<void> {
    const todayFutureFund = await this.futureFundService.today(date, userId);
    if (price > todayFutureFund.limit) {
      throw new BadRequestException('요청한 금액이 한도를 초과하였습니다.');
    }

    const todayFutureFundApply = await this.futureFundService.findTodayApply(
      date,
      userId,
    );
    if (todayFutureFundApply) {
      throw new BadRequestException('미래 정산을 이미 신청했어요.');
    }

    const count = await this.prismaService.futureFundApply.count({
      where: {
        userId,
        status: FutureFundStatus.DONE,
      },
    });
    const compareBondList = await this.prismaService.bond.groupBy({
      by: ['userId'],
      where: {
        userId,
        transactionAt: {
          gte: dayjs(date)
            .subtract(14, 'day')
            .hour(0)
            .minute(0)
            .second(0)
            .toDate(),
          lte: dayjs(date)
            .subtract(7, 'day')
            .hour(23)
            .minute(59)
            .second(59)
            .toDate(),
        },
      },
      _sum: {
        approvalAmount: true,
      },
    });
    const bondList = await this.prismaService.bond.groupBy({
      by: ['userId'],
      where: {
        userId,
        transactionAt: {
          gte: dayjs(date)
            .subtract(7, 'day')
            .hour(0)
            .minute(0)
            .second(0)
            .toDate(),
          lte: dayjs(date).hour(23).minute(59).second(59).toDate(),
        },
      },
      _sum: {
        approvalAmount: true,
      },
    });
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
        limitFutureFund: true,
      },
    });

    const recent7DaysSalesPrice = Math.floor(
      bondList[0]._sum.approvalAmount / 7,
    );
    const recent14DaysSalesPrice = Math.floor(
      compareBondList[0]._sum.approvalAmount / 7,
    );

    try {
      await (tx ? tx : this.prismaService).futureFundApply.create({
        data: {
          applyAt: date,
          applyPrice: price,
          status: FutureFundStatus.READY,
          limit: user.limitFutureFund,
          futureFundPrice: todayFutureFund.futureFundInUse,
          avgSalesPrice: recent7DaysSalesPrice,
          avgSalesPriceRate:
            ((recent7DaysSalesPrice - recent14DaysSalesPrice) /
              recent14DaysSalesPrice) *
              100 || 0,
          count,
          userId,
        },
      });

      await this.slackService.sendBlocks(
        Message()
          .blocks(
            Section().text(Md.bold(`미래정산금 신청 건이 발생했어요.`)),
            Section().text(
              Md.codeBlock(
                [
                  `신청일 : ${date}`,
                  `업체명 : ${user.name}`,
                  `한도 : ${user.limitFutureFund.toLocaleString()} 원`,
                  `사용중 금액 : ${todayFutureFund.futureFundInUse.toLocaleString()} 원`,
                  `신청 금액 : ${price.toLocaleString()} 원`,
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
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error);
    }
  }

  async updateStatus(data: UpdateFutureFundDto): Promise<boolean> {
    await this.prismaService.$transaction(async (tx) => {
      if (data.status === FutureFundStatus.DONE) {
        const list = await tx.futureFundApply.findMany({
          where: {
            id: {
              in: data.ids,
            },
          },
        });

        await Promise.all(
          list.map((apply) =>
            this.futureFundService.apply(
              {
                userId: apply.userId,
                date: apply.applyAt,
                price: apply.applyPrice,
              },
              { tx },
            ),
          ),
        );
      }

      await tx.futureFundApply.updateMany({
        where: {
          id: {
            in: data.ids,
          },
        },
        data: {
          status: data.status,
        },
      });
    });

    return true;
  }
}
