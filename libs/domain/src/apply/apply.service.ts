import { ApplyDto } from '@app/domain/apply/dtos';
import { CreateApplyDto } from '@app/domain/apply/dtos/create-apply.dto';
import { PrismaService } from '@app/utils/prisma';

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApplyStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { SlackService } from 'nestjs-slack';
import { Md, Message, Section } from 'slack-block-builder';

export const exposeApplyStatus = (status: ApplyStatus) => {
  if (status === ApplyStatus.NEW_APPLY) {
    return '신규 신청';
  }

  if (status === ApplyStatus.IN_BUSINESS) {
    return '영업중';
  }

  if (status === ApplyStatus.IN_CONTRACT) {
    return '계약중';
  }

  if (status === ApplyStatus.IN_HOLD) {
    return '보류';
  }

  return '-';
};

@Injectable()
export class ApplyService {
  constructor(
    private readonly prismaService: PrismaService,
    private slackService: SlackService,
  ) {}
  async list({
    userId,
    status,
  }: {
    userId: number;
    status: ApplyStatus;
  }): Promise<ApplyDto[]> {
    const list = await this.prismaService.apply.findMany({
      where: {
        status,
        ...(userId && {
          userId,
        }),
      },
      select: {
        id: true,
        createdAt: true,
        name: true,
        companyName: true,
        email: true,
        phoneNumber: true,
        status: true,
        companyType: true,
        industryType: true,
        address: true,
        monthlySales: true,
        jobTitle: true,
        interestedService: true,
        marketingAgree: true,
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
    });

    return plainToInstance(
      ApplyDto,
      list.map((item) => ({
        ...item,
        status: exposeApplyStatus(item.status),
      })),
    );
  }

  async updateApplyStatusByIds(
    applyIds: number[],
    status: ApplyStatus,
  ): Promise<boolean> {
    try {
      await this.prismaService.apply.updateMany({
        where: {
          id: {
            in: applyIds,
          },
        },
        data: {
          status,
        },
      });

      return true;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async apply({ ...leftover }: CreateApplyDto): Promise<void> {
    const exist = await this.prismaService.apply.findFirst({
      where: {
        email: leftover.email,
      },
    });
    if (exist) {
      throw new BadRequestException('이미 신청이 완료되었습니다.');
    }

    try {
      await this.prismaService.apply.create({
        data: {
          ...leftover,
        },
      });

      await this.slackService.sendBlocks(
        Message()
          .blocks(
            Section().text(Md.bold(`서비스 도입 문의가 발생했어요.`)),
            Section().text(
              Md.codeBlock(
                [
                  `업체명 : ${leftover.companyName}`,
                  `담당자 : ${leftover.name} / ${leftover.jobTitle}`,
                  `담당자 연락처 : ${leftover.phoneNumber}`,
                  `월 평균 매출 : ${leftover.monthlySales}원`,
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
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
