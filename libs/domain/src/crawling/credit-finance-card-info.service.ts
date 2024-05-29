import { CrawlingDataType } from '@app/domain/crawling/crawling.type';
import { login } from '@app/domain/crawling/credit-finance-approve.service';
import { parseCardCompanyName, retry } from '@app/utils';
import { PrismaService } from '@app/utils/prisma';
import { S3Service } from '@app/utils/s3';

import { Injectable, Logger } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { CrawlingFileType, CrawlingType } from '@prisma/client';
import * as dayjs from 'dayjs';
import * as fs from 'fs';
import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';

export type CardInfo = {
  cardCompanyName: string;
  creditCardFee: number;
  checkCardFee: number;
  fundDate: number;
};

@Injectable()
export class CreditFinanceCardInfoService {
  private readonly logger = new Logger(CreditFinanceCardInfoService.name);

  constructor(
    private prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async loadData({
    data,
    userId,
    type,
  }: {
    data: CardInfo[];
    userId: number;
    type: CrawlingType;
  }) {
    if (!data.length) {
      this.logger.log(
        `>>>>> 여신 금융 가맹점 수수료율/대금지급주기 크롤링 생성할 내용 없음`,
      );
      return;
    }
    this.logger.log(`>>>>> 여신 금융 가맹점 수수료율/대금지급주기 크롤링 생성`);
    await this.prisma.cardInfos.createMany({
      data: data.map((record) => ({
        userId,
        type,
        cardCompanyName: parseCardCompanyName(record.cardCompanyName),
        settlementCycle: record.fundDate,
        creditCardRate: record.creditCardFee / 100,
        checkCardRate: record.checkCardFee / 100,
      })),
      skipDuplicates: true,
    });
    this.logger.log(
      `>>>>> 여신 금융 가맹점 수수료율/대금지급주기 크롤링 생성 완료`,
    );
  }

  async crawling({
    requestId,
    loginId,
    password,
  }: CrawlingDataType): Promise<CardInfo[]> {
    this.logger.log(
      `>>>>> 여신 금융 가맹점 수수료율/대금지급주기 크롤링 시작: ${requestId}`,
    );
    const browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      headless: true,
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();
    const recorder = new PuppeteerScreenRecorder(page, {
      followNewTab: true,
      fps: 25,
      ffmpeg_Path: null,
      videoFrame: {
        width: 1024,
        height: 768,
      },
      videoCrf: 18,
      videoCodec: 'libx264',
      videoPreset: 'ultrafast',
      videoBitrate: 1000,
      autopad: {
        color: 'black',
      },
      aspectRatio: '4:3',
    });
    const recordFileName = `credit_finance_fee_crawling_${requestId}_${dayjs().format(
      'YYYY-MM-DD_HH-mm-ss',
    )}.mp4`;
    const recordPath = `./records/${recordFileName}`;

    try {
      await recorder.start(recordPath);
      await page.setViewport({ width: 1480, height: 1024 });
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'platform', { get: () => 'macintel' });
      });

      await login(browser, page, loginId, password);

      await page.goto('https://www.cardsales.or.kr/page/mypage/mer/payperiod');
      const pages2 = await browser.pages();
      for (const _page of pages2) {
        if (!_page.url().includes('/page/mypage/mer/payperiod')) {
          await _page.close();
        }
      }

      const tableContentSelector = '#merGrpDetailListBody > tr';
      await page.waitForSelector(tableContentSelector);

      const tableSelector = '#merGrpDetailListBody';
      const tableElements = await page.waitForSelector(tableSelector);
      const cardInfos: CardInfo[] = await tableElements?.evaluate((record) => {
        const result = [];
        for (const item of record.children) {
          const cardCompanyName = item.children[0]?.innerHTML || null;
          const creditCardFee = item.children[4]?.innerHTML || 0;
          const checkCardFee = item.children[6]?.innerHTML || 0;
          const fundDate = item.children[7]?.innerHTML || '0일';
          result.push({
            cardCompanyName,
            creditCardFee: Number(creditCardFee),
            checkCardFee: Number(checkCardFee),
            fundDate: Number(fundDate.replace(/\D+/g, '')) + 1,
          });
        }

        return result;
      });

      this.logger.log(
        `>>>>> 여신 금융 가맹점 수수료율/대금지급주기 크롤링 종료: ${requestId}, 총 수: ${
          cardInfos.length
        }, 내용: ${JSON.stringify(cardInfos)}`,
      );
      return cardInfos.filter((cardInfo) => cardInfo.cardCompanyName);
    } catch (error) {
      this.logger.error(
        `>>>>> 여신 금융 가맹점 수수료율/대금지급주기 크롤링 오류 ${requestId}`,
      );
      this.logger.error(error);
      throw new RuntimeException(error);
    } finally {
      await recorder.stop();
      await this.recordToS3(recordPath, recordFileName, requestId);
      await browser.close();
    }
  }

  private async recordToS3(
    recordPath: string,
    recordFileName: string,
    requestId: string,
  ) {
    const buffer = fs.readFileSync(recordPath);
    await this.s3Service.put({
      key: `records/${recordFileName}`,
      buffer: buffer,
    });
    const crawling = await this.prisma.crawling.findFirst({
      where: {
        requestId,
      },
    });
    await this.prisma.crawlingFiles.create({
      data: {
        type: CrawlingFileType.RECORD,
        crawlingId: crawling.id,
        url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.APP_ENV}/records/${recordFileName}`,
      },
    });
    if (fs.existsSync(recordPath)) {
      fs.unlinkSync(recordPath);
    }
  }
}
