import {
  BondRecordType,
  CardClassificationService,
  CrawlingDataType,
  CreditFinanceCardValue,
  login,
} from '@app/domain/crawling';
import { generateTransactionId } from '@app/domain/crawling/crawling.helper';
import { parseCardCompanyName, retry } from '@app/utils';
import { PrismaService } from '@app/utils/prisma';
import { CardNumberQueueService, CardNumberQueueType } from '@app/utils/queue';
import { S3Service } from '@app/utils/s3';

import { Injectable, Logger } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import {
  ApprovalType,
  CardType,
  CrawlingFileType,
  CrawlingType,
} from '@prisma/client';
import * as dayjs from 'dayjs';
import * as Excel from 'exceljs';
import * as fs from 'fs';
import * as _ from 'lodash';
import { customAlphabet } from 'nanoid';
import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import * as XLSX from 'xlsx';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 서로 다르면 true, 같으면 false
const isDifferentRecord = (
  base: BondRecordType,
  target: Partial<BondRecordType>,
): boolean => {
  const baseCompareItems = [
    base.purchaseAt,
    base.depositAmount,
    base.depositAt,
    base.cardNumber,
    base.commission,
    base.cardType,
    base.approvalType,
    base.approvalAmount,
  ];
  const targetCompareItems = [
    target.purchaseAt,
    target.depositAmount,
    target.depositAt,
    target.cardNumber,
    target.commission,
    target.cardType,
    target.approvalType,
    target.approvalAmount,
  ];
  return baseCompareItems.join('_') !== targetCompareItems.join('_');
};

function getFilePath(requestId: string) {
  return `crawling_${requestId}_${new Date().getTime()}_${customAlphabet(
    '1234567890',
    5,
  )()}`;
}

@Injectable()
export class CreditFinancePurchaseService {
  private readonly logger = new Logger(CreditFinancePurchaseService.name);

  constructor(
    private prisma: PrismaService,
    private readonly cardClassificationService: CardClassificationService,
    private readonly cardNumberQueueService: CardNumberQueueService,
    private readonly s3Service: S3Service,
  ) {}

  async loadData({ filePath, requestId, userId }): Promise<void> {
    this.logger.log(`>>>> 여신 금융 매입내역 데이터 적재 시작 ${requestId}`);
    try {
      // xls -> xlsx
      const newFilePath = `${filePath}x`;
      const converterWorkbook = XLSX.readFile(filePath);
      XLSX.writeFile(converterWorkbook, newFilePath, { bookType: 'xlsx' });

      const workbook = new Excel.Workbook();
      await workbook.xlsx.readFile(newFilePath);
      const sheet = workbook.worksheets[0];
      const headers = [
        null,
        'No.',
        '거래일자',
        '매입일자',
        '승인번호',
        '카드사',
        '제휴카드사',
        '카드번호',
        '카드종류',
        '매입금액',
        '가맹점수수료',
        '수수료포인트',
        '수수료포인트률',
        '기타수수료',
        '수수료합계(B)',
        '부가세대리납부금액(C)',
        '지급금액(A-B-C)',
        '지급예정일',
        'MPM QR결제여부',
      ];

      const headerIndex = 3;
      const indexInfo = {
        transactionAtDate: 2,
        purchaseAtDate: 3,
        approvalNumber: 4,
        cardCompanyName: 5,
        cardNumber: 7,
        cardType: 8,
        approvalAmount: 9,
        commission: 10,
        depositAmount: 16,
        depositAt: 17,
      };

      const headerRow = sheet?.getRow(headerIndex);
      if (JSON.stringify(headers) !== JSON.stringify(headerRow.values)) {
        throw new RuntimeException(
          `유효하지 않은 엑셀 양식입니다. ${JSON.stringify(headerRow.values)}`,
        );
      }

      const records: BondRecordType[] = [];

      const cardTypeStore =
        await this.cardClassificationService.findCardClassification();
      const pleaseInsertCardTypeList: {
        cardNumber: string;
        type: CardType;
      }[] = [];

      sheet?.eachRow((row, rowIndex) => {
        if (rowIndex > headerIndex) {
          const rowValues = JSON.parse(JSON.stringify(row.values));
          const approvalAmount: number = rowValues[indexInfo.approvalAmount];
          const approvalType: ApprovalType =
            approvalAmount < 0 ? ApprovalType.CANCEL : ApprovalType.APPROVED;
          const approvalNumber: string = rowValues[indexInfo.approvalNumber];
          const cardNumber = rowValues[indexInfo.cardNumber] || '';
          const cardType =
            rowValues[indexInfo.cardType] === '신용카드'
              ? CardType.CREDIT
              : rowValues[indexInfo.cardType] === '체크카드'
              ? CardType.CHECK
              : cardTypeStore[cardNumber.substr(0, 7)] || null;

          /*** 카드 분류 정보를 데이터베이스에 적재하기 위해 ***/
          !cardTypeStore[cardNumber.substr(0, 7)] &&
            pleaseInsertCardTypeList.push({
              cardNumber: cardNumber.substr(0, 7),
              type: cardType,
            });

          const transactionAt = `${
            rowValues[indexInfo.transactionAtDate]
          } 09:00:00`;
          const purchaseAt = `${rowValues[indexInfo.purchaseAtDate]} 09:00:00`;
          const depositAt = `${rowValues[indexInfo.depositAt]} 09:00:00`;
          const transactionId = generateTransactionId({
            transactionAtDate: rowValues[indexInfo.transactionAtDate],
            approvalType,
            approvalNumber,
            approvalAmount,
          });

          records.push({
            userId,
            transactionId,
            transactionAt: dayjs(transactionAt, 'YYYY-MM-DD HH:mm:ss').isValid()
              ? dayjs(transactionAt).toDate()
              : null,
            purchaseAt: dayjs(purchaseAt, 'YYYY-MM-DD HH:mm:ss').isValid()
              ? dayjs(purchaseAt).toDate()
              : null,
            depositAmount: rowValues[indexInfo.depositAmount],
            depositAt: dayjs(depositAt, 'YYYYMMDD HH:mm:ss').isValid()
              ? dayjs(depositAt).toDate()
              : null,
            cardNumber,
            commission: rowValues[indexInfo.commission] * -1,
            cardCompanyName: parseCardCompanyName(
              rowValues[indexInfo.cardCompanyName],
            ),
            originalCardCompanyName: rowValues[indexInfo.cardCompanyName],
            cardType,
            approvalType,
            approvalNumber,
            approvalAmount,
          });
        }
      });

      /*** 새로운 카드 분류 추가 **/
      const uniqueInsertCardTypeList = _.uniqBy(
        pleaseInsertCardTypeList,
        'cardNumber',
      );
      if (uniqueInsertCardTypeList.length) {
        await this.cardNumberQueueService.addQueue(
          {
            cardNumbers: uniqueInsertCardTypeList,
            type: CardNumberQueueType.ADD_CARD_NUMBER,
          },
          requestId,
        );
      }

      await this.prisma.$transaction(async (tx) => {
        const existList = await tx.bond.findMany({
          where: {
            transactionId: {
              in: records.map((record) => record.transactionId),
            },
            userId,
          },
          select: {
            transactionId: true,
            purchaseAt: true,
            depositAmount: true,
            depositAt: true,
            cardNumber: true,
            commission: true,
            cardType: true,
            approvalType: true,
            approvalAmount: true,
          },
        });
        const existTransactionIds = existList.map(
          (exist) => exist.transactionId,
        );
        const updateList = records.filter(
          (record) =>
            existTransactionIds.includes(record.transactionId) &&
            isDifferentRecord(
              record,
              existList.find(
                (item) => item.transactionId === record.transactionId,
              ),
            ),
        );
        if (updateList.length) {
          await Promise.all(
            updateList.map((record) =>
              tx.bond.update({
                where: {
                  transactionId_userId: {
                    transactionId: record.transactionId,
                    userId: record.userId,
                  },
                },
                data: {
                  purchaseAt: record.purchaseAt,
                  depositAmount: record.depositAmount,
                  depositAt: record.depositAt,
                  cardNumber: record.cardNumber,
                  commission: record.commission,
                  cardType: record.cardType,
                  approvalType: record.approvalType,
                  approvalAmount: record.approvalAmount,
                },
              }),
            ),
          );
        }

        const createList = records.filter(
          (record) => !existTransactionIds.includes(record.transactionId),
        );
        if (createList.length) {
          await tx.bond.createMany({
            data: createList,
            skipDuplicates: true,
          });
        }

        fs.unlinkSync(newFilePath);
        fs.unlinkSync(filePath);
        this.logger.log(
          `>>>> 여신 금융 매입내역 데이터 적재 종료 ${requestId} 생성: ${
            createList.length || 0
          }, 수정: ${updateList.length || 0}`,
        );
      });
    } catch (error) {
      this.logger.log(`>>>> 여신 금융 매입내역 데이터 적재 실패 ${requestId}`);
      throw new RuntimeException(error);
    }
  }

  async crawling({
    userId,
    requestId,
    loginId,
    password,
  }: CrawlingDataType): Promise<string[]> {
    const crawlingInfo = await this.prisma.crawlingInfo.findFirst({
      where: {
        userId,
        type: CrawlingType.CREDIT_FINANCE,
      },
      include: {
        CrawlingInfoCards: true,
      },
    });

    this.logger.log(`>>>>> 여신 금융 매입내역 크롤링 시작: ${requestId}`);
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
    const recordFileName = `credit_finance_purchased_crawling_${requestId}_${dayjs().format(
      'YYYY-MM-DD_HH-mm-ss',
    )}.mp4`;
    const recordPath = `./records/${recordFileName}`;

    const searchAndDownload = async (filePath: string): Promise<boolean> => {
      // 조회 클릭
      const searchButton = '#searchBtn';
      await page.waitForSelector(searchButton);
      await page.click(searchButton);

      await delay(2000);

      const emptyValue = await page.evaluate(() => {
        return document.querySelector('#tbodyMain').innerHTML;
      });
      if (emptyValue.includes('조회된 결과가 없습니다.')) {
        this.logger.log(
          `>>>>> 여신 금융 승인 내역 크롤링 조회 결과가 없습니다.`,
        );
        return false;
      }

      // 전체 체크박스 클릭
      const allCheckbox = '.inquiry_screen table thead .check input';
      const allCheckEle = await page.waitForSelector(allCheckbox);
      await retry(
        10,
        async () => {
          this.logger.log(`>>>>>> 전체 선택 대기 중 ${`./files/${filePath}`}`);
          await allCheckEle?.click();
          return await allCheckEle?.evaluate((el) => el.checked);
        },
        {
          timeout: 150,
          errorMessage: '전체 체크박스 선택 대기 중 에러!!',
        },
      );

      // 상세 조회 버튼 클릭
      const detailSearchButton =
        '.inquiry_screen .bottom_btn_area li:nth-child(1)';
      await page.waitForSelector(detailSearchButton);
      await page.click(detailSearchButton);

      // 엑셀 다운로드 버튼 클릭
      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        searchList('Excel');
      });

      // // 대기
      await retry(
        10,
        async () => {
          this.logger.log(
            `>>>>>> 업로드 파일 대기 중 ${`./files/${filePath}`}`,
          );
          return fs.existsSync(
            `./files/${filePath}/기간별매입내역_세부내역.xls`,
          );
        },
        {
          timeout: 1000,
          errorMessage: '업로드 파일 대기 중 에러!!',
        },
      );

      return true;
    };

    try {
      await recorder.start(recordPath);
      await page.setViewport({ width: 1480, height: 1024 });
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'platform', { get: () => 'macintel' });
      });
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });
      const client = await page.target().createCDPSession();

      // 로그인 버튼 대기
      await login(browser, page, loginId, password);

      // 기간별 매입내역 조회 페이지 이동
      await page.goto('https://www.cardsales.or.kr/page/purchase/term');
      const pages2 = await browser.pages();
      for (const _page of pages2) {
        if (!_page.url().includes('/purchase/term')) {
          await _page.close();
        }
      }

      const filePaths: string[] = [];
      if (crawlingInfo.CrawlingInfoCards.length) {
        for (const info of crawlingInfo.CrawlingInfoCards) {
          this.logger.log(
            `>>>>> 여신 금융 매입 내역 ${info.cardCompanyName} 크롤링 중...`,
          );
          const filePath = `crawling_${new Date().getTime()}_${customAlphabet(
            '1234567890',
            5,
          )()}`;
          const downloadPath = `./files/${filePath}/`;
          if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath);
          }
          await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath,
          });

          const cardValue = CreditFinanceCardValue[info.cardCompanyName];
          if (!cardValue) {
            this.logger.warn(
              `>>> ${info.cardCompanyName} 카드사에 해당하는 여신금융협회 값이 존재하지 않습니다.`,
            );
          }

          const cardTypeSelect = '#cardCo';
          await page.waitForSelector(cardTypeSelect);
          await page.select(cardTypeSelect, cardValue);

          const franchiseeSelect = '#merNo';
          await page.waitForSelector(franchiseeSelect);
          await page.waitForSelector(
            `option[value="${info.franchiseNumber}"]`,
            {
              timeout: 5000,
            },
          );
          await page.select(franchiseeSelect, info.franchiseNumber);

          const result = await searchAndDownload(filePath);
          if (!result) {
            continue;
          }

          filePaths.push(filePath);
        }
      }

      if (!crawlingInfo.CrawlingInfoCards.length) {
        const filePath = getFilePath(requestId);
        const downloadPath = `./files/${filePath}/`;
        if (!fs.existsSync(downloadPath)) {
          fs.mkdirSync(downloadPath);
        }
        await client.send('Page.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath,
        });

        const result = await searchAndDownload(filePath);
        if (result) {
          filePaths.push(filePath);
        }
      }

      this.logger.log(`>>>>> 여신 금융 매입내역  크롤링 종료: ${requestId}`);
      return filePaths;
    } catch (error) {
      this.logger.error(`>>>>> 여신 금융 매입내역  크롤링 오류 ${requestId}`);
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
