import { CrawlingInfoDto } from '@app/domain/crawling/dtos/crawling-info.dto';
import { CrawlingDto } from '@app/domain/crawling/dtos/crawling.dto';
import { PrismaService } from '@app/utils/prisma';
import { CrawlingQueueService, CrawlingQueueType } from '@app/utils/queue';
import { S3Service } from '@app/utils/s3';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { CrawlingFileType, CrawlingStatus, CrawlingType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import * as fs from 'fs';

@Injectable()
export class CrawlingService {
  private readonly logger = new Logger(CrawlingService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private crawlingQueueService: CrawlingQueueService,
  ) {}

  async findById(requestId: number): Promise<CrawlingDto> {
    const result = await this.prisma.crawling.findFirst({
      where: {
        id: requestId,
      },
    });
    if (!result) {
      throw new BadRequestException('유효하지 않은 요청입니다.');
    }

    return plainToInstance(CrawlingDto, result);
  }

  async deleteCrawlingFranchise(id: number): Promise<boolean> {
    await this.prisma.crawlingInfoCards.delete({
      where: {
        id,
      },
    });

    return true;
  }

  async findCrawlingInfosByUserId(userId: number): Promise<CrawlingInfoDto[]> {
    const result = await this.prisma.crawlingInfo.findMany({
      where: {
        User: {
          id: userId,
        },
      },
      include: {
        CrawlingInfoCards: true,
      },
    });

    return plainToInstance(
      CrawlingInfoDto,
      result.map((item) => ({
        ...item,
        franchiseInfos: item.CrawlingInfoCards,
      })),
    );
  }

  async uploadToS3({ filePath, key, requestId, crawlingId }): Promise<void> {
    this.logger.log(`>>>> 크롤링 파일 업로드 시작 ${requestId}`);
    try {
      fs.statSync(filePath);
    } catch (error) {
      this.logger.log(`>>>> 크롤링 파일 업로드 실패 ${requestId}`);
      throw new RuntimeException(
        `${filePath} 이 존재하지 않습니다. ${requestId}`,
      );
    }

    try {
      const buffer = fs.readFileSync(filePath);
      await this.s3Service.put({
        key,
        buffer: buffer,
      });
      await this.prisma.crawlingFiles.create({
        data: {
          type: CrawlingFileType.EXCEL,
          crawlingId: crawlingId,
          url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.APP_ENV}/${key}`,
        },
      });
      this.logger.log(`>>>> 크롤링 파일 업로드 성공 ${requestId}`);
    } catch (error) {
      this.logger.log(`>>>> 크롤링 파일 업로드 실패 ${requestId}`);
      throw new RuntimeException(error);
    }
  }

  async updateStatus(
    id: number,
    status: CrawlingStatus,
    reason?: string,
    attempts = 0,
  ): Promise<boolean> {
    try {
      await this.prisma.crawling.update({
        where: {
          id,
        },
        data: {
          status,
          failedReason: reason || null,
          attempts,
        },
      });

      return true;
    } catch (error) {
      throw new RuntimeException(error);
    }
  }

  async request({
    requestId,
    userId,
    isBatch,
    type,
    crawlingQueueType,
    password,
    loginId,
  }: {
    loginId: string;
    password: string;
    crawlingQueueType: CrawlingQueueType;
    type: CrawlingType;
    requestId: string;
    userId: number;
    isBatch: boolean;
  }): Promise<CrawlingDto> {
    this.logger.log(
      `>>>> 크롤링 요청 시작 ${requestId} type: ${type}, crawlingQueueType: ${crawlingQueueType} isBatch: ${isBatch}`,
    );
    try {
      return await this.prisma.$transaction(async (tx) => {
        const crawling = await tx.crawling.create({
          data: {
            type,
            status: CrawlingStatus.REQUEST,
            requestId,
            userId,
            isBatch,
          },
        });

        const resultForSales = await this.crawlingQueueService.addQueue(
          {
            loginId,
            password,
            type: crawlingQueueType,
            crawlingId: crawling.id,
            userId,
          },
          requestId,
        );
        if (!resultForSales) {
          throw new RuntimeException(
            `크롤링을 큐에 등록하지 못하였습니다. ${requestId}`,
          );
        }

        this.logger.log(`>>>> 크롤링 요청 완료 ${requestId}`);
        return plainToInstance(CrawlingDto, crawling);
      });
    } catch (error) {
      this.logger.error(`>>>> 크롤링 요청 실패 ${requestId}`);
      this.logger.error(error);
    }
  }
}
