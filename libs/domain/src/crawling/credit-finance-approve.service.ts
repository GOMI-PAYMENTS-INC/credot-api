import {
  BondRecordType,
  CardClassificationService,
  CrawlingDataType,
} from '@app/domain/crawling';
import { generateTransactionId } from '@app/domain/crawling/crawling.helper';
import { delay, parseCardCompanyName, retry } from '@app/utils';
import { PrismaService } from '@app/utils/prisma';
import { S3Service } from '@app/utils/s3';

import { Injectable, Logger } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import {
  ApprovalType,
  CardCompanyName,
  CrawlingFileType,
  CrawlingType,
} from '@prisma/client';
import * as dayjs from 'dayjs';
import * as Excel from 'exceljs';
import * as fs from 'fs';
import { customAlphabet } from 'nanoid';
import puppeteer, { Browser, Page } from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import * as XLSX from 'xlsx';
export const CreditFinanceCardValue = {
  [CardCompanyName.KB_CARD]: '01',
  [CardCompanyName.SHINHAN_CARD]: '03',
  [CardCompanyName.BC_CARD]: '04',
  [CardCompanyName.LOTTE_CARD]: '11',
  [CardCompanyName.HYUNDAE_CARD]: '12',
  [CardCompanyName.SAMSUNG_CARD]: '13',
  CITY_CARD: '18',
  [CardCompanyName.NH_CARD]: '19',
  [CardCompanyName.HANA_CARD]: '21',
  [CardCompanyName.WOORI_CARD]: '23',
};

export const waitingLoadingBar = async (page: Page) => {
  await retry(
    10,
    async () => {
      const displayValue = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return document.querySelector('#progressbarArea')?.style.display;
      });
      if (displayValue === 'none') {
        return true;
      }

      await page.reload();
    },
    {
      timeout: 1500,
      errorMessage: '로딩이 지속적으로 진행되고 있습니다.',
    },
  );
};

export const login = async (
  browser: Browser,
  page: Page,
  id: string,
  password: string,
) => {
  await retry(
    10,
    async () => {
      try {
        await page.goto(`https://www.cardsales.or.kr/signin`);
        return true;
      } catch (error: any) {
        await page.goto('https://google.com');
        return false;
      }
    },
    {
      timeout: 1000,
      errorMessage: '로그인 화면으로 이동이 되지 않습니다.',
    },
  );

  await waitingLoadingBar(page);

  // 로그인 버튼 대기
  const loginButtonSelector = '#goLogin';
  await retry(
    10,
    async () => {
      const loginBtn = await page.waitForSelector(loginButtonSelector);
      return !!loginBtn;
    },
    {
      timeout: 1000,
      errorMessage: '로그인 버튼이 존재하지 않습니다.',
    },
  );

  // 로그인 시작
  await page.type('#j_username', id);
  await page.type('#j_password', password);
  await retry(
    10,
    async () => {
      await page.click(loginButtonSelector);
      const afterLoginPage = await page.waitForSelector('.index_content_data');
      return !!afterLoginPage;
    },
    {
      timeout: 1000,
      errorMessage: '로그인 처리가 정상적으로 수행되지 않았습니다.',
    },
  );
};

function getFilePath(requestId: string) {
  return `crawling_${requestId}_${new Date().getTime()}_${customAlphabet(
    '1234567890',
    5,
  )()}`;
}

@Injectable()
export class CreditFinanceApproveService {
  private readonly logger = new Logger(CreditFinanceApproveService.name);

  constructor(
    private prisma: PrismaService,
    private readonly cardClassificationService: CardClassificationService,
    private readonly s3Service: S3Service,
  ) {}

  async loginCheck({
    requestId,
    loginId,
    password,
  }: CrawlingDataType): Promise<boolean> {
    this.logger.log(`>>>>> 여신 금융 로그인 체크 크롤링 시작: ${requestId}`);
    const browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      headless: true,
      args: ['--no-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1480, height: 1024 });
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'platform', { get: () => 'macintel' });
      });
      await page.goto(`https://www.cardsales.or.kr/signin`);

      // 로그인 버튼 대기
      const loginButtonSelector = '#goLogin';
      await page.waitForSelector(loginButtonSelector);

      // 로그인 시작
      await page.type('#j_username', loginId);
      await page.type('#j_password', password);
      await page.click(loginButtonSelector);

      await delay(300);

      // 기간별 승인내역 조회 페이지 이동
      await page.goto('https://www.cardsales.or.kr/page/approval/term');

      // 조회 클릭
      const searchButton = '#searchBtn';
      await page.waitForSelector(searchButton, {
        timeout: 1500,
      });

      this.logger.log(`>>>>> 여신 금융 로그인 체크 크롤링 종료: ${requestId}`);
      return true;
    } catch (error) {
      this.logger.error(`>>>>> 여신 금융 체크 크롤링 종료(에러) ${requestId}`);
      this.logger.error(error);
      return false;
    } finally {
      await browser.close();
    }
  }

  async loadData({ filePath, requestId, userId }): Promise<void> {
    this.logger.log(`>>>> 여신 금융 승인내역 데이터 적재 시작 ${requestId}`);
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
        '구분',
        '거래일자',
        '거래시간',
        '카드사',
        '제휴카드사',
        '카드번호',
        '승인번호',
        '승인금액',
        '할부기간',
      ];

      const headerIndex = 3;
      const indexInfo = {
        cardCompanyName: 5,
        transactionAtDate: 3,
        transactionAtHours: 4,
        cardNumber: 7,
        approvalType: 2,
        approvalNumber: 8,
        approvalAmount: 9,
        installmentPeriod: 10,
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

      sheet?.eachRow((row, rowIndex) => {
        if (rowIndex > headerIndex) {
          const rowValues = JSON.parse(JSON.stringify(row.values));
          const approvalType: ApprovalType =
            rowValues[indexInfo.approvalType] === '승인'
              ? ApprovalType.APPROVED
              : ApprovalType.CANCEL;
          const approvalNumber: string = rowValues[indexInfo.approvalNumber];
          const approvalAmount: number = rowValues[indexInfo.approvalAmount];
          const cardNumber = rowValues[indexInfo.cardNumber] || '';
          const cardType = cardTypeStore[cardNumber.substr(0, 7)] || null;
          const transactionAt = `${rowValues[indexInfo.transactionAtDate]} ${
            rowValues[indexInfo.transactionAtHours]
          }`;
          const transactionId = generateTransactionId({
            transactionAtDate: `${rowValues[indexInfo.transactionAtDate]}`,
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
            cardNumber,
            cardCompanyName: parseCardCompanyName(
              rowValues[indexInfo.cardCompanyName],
            ),
            originalCardCompanyName: rowValues[indexInfo.cardCompanyName],
            cardType,
            approvalType,
            approvalNumber,
            approvalAmount,
            installmentPeriod: rowValues[indexInfo.installmentPeriod],
          });
        }
      });

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
            transactionAt: true,
          },
        });
        const existTransactionIds = existList.map(
          (exist) => exist.transactionId,
        );

        // 레코드는 존재하지만 거래일이 없는 경우에만 수정한다.
        const updateList = records.filter(
          (record) =>
            existTransactionIds.includes(record.transactionId) &&
            !existList.find(
              (item) => item.transactionId === record.transactionId,
            ).transactionAt,
        );
        if (updateList.length) {
          await Promise.all(
            updateList.map((record) =>
              tx.bond.update({
                where: {
                  transactionId_userId: {
                    transactionId: record.transactionId,
                    userId,
                  },
                },
                data: {
                  transactionAt: record.transactionAt,
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
          `>>>> 여신 금융 승인내역 데이터 적재 종료 ${requestId} 생성: ${
            createList.length || 0
          }, 수정: ${updateList.length || 0}`,
        );
      });
    } catch (error) {
      this.logger.log(`>>>> 여신 금융 승인내역 데이터 적재 실패 ${requestId}`);
      throw new RuntimeException(error);
    }
  }

  async crawling({ requestId, loginId, password, userId }: CrawlingDataType) {
    const crawlingInfo = await this.prisma.crawlingInfo.findFirst({
      where: {
        userId,
        type: CrawlingType.CREDIT_FINANCE,
      },
      include: {
        CrawlingInfoCards: true,
      },
    });

    this.logger.log(`>>>>> 여신 금융 승인내역 크롤링 시작: ${requestId}`);
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
    const recordFileName = `credit_finance_approved_crawling_${requestId}_${dayjs().format(
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
        return document.querySelector('#list-content').innerHTML;
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
        '.inquiry_screen .bottom_btn_area li:nth-child(2)';
      await page.waitForSelector(detailSearchButton);
      await page.click(detailSearchButton);

      // 엑셀 다운로드 버튼 클릭
      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        searchList('EXCEL');
      });

      // // 대기
      await retry(
        10,
        async () => {
          this.logger.log(
            `>>>>>> 업로드 파일 대기 중 ${`./files/${filePath}`}`,
          );
          return fs.existsSync(
            `./files/${filePath}/기간별승인내역_세부내역.xls`,
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

      await login(browser, page, loginId, password);

      // 기간별 승인내역 조회 페이지 이동
      await page.goto('https://www.cardsales.or.kr/page/approval/term');
      const pages2 = await browser.pages();
      for (const _page of pages2) {
        if (!_page.url().includes('/approval/term')) {
          await _page.close();
        }
      }

      const filePaths: string[] = [];

      // 크롤링 정보에 가맹점 정보가 존재하면 해당 정보만 처리
      if (crawlingInfo.CrawlingInfoCards.length) {
        for (const info of crawlingInfo.CrawlingInfoCards) {
          this.logger.log(
            `>>>>> 여신 금융 승인 내역 ${info.cardCompanyName} 크롤링 중...`,
          );
          const filePath = getFilePath(requestId);
          const downloadPath = `./files/${filePath}/`;
          if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath);
          }
          await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath,
          });

          /* 카드사별 가맹점 선택 */
          const cardValue = CreditFinanceCardValue[info.cardCompanyName];
          if (!cardValue) {
            this.logger.warn(
              `>>> ${info.cardCompanyName} 카드사에 해당하는 여신금융협회 값이 존재하지 않습니다.`,
            );
            continue;
          }

          const cardTypeSelect = '#cardCo';
          await page.waitForSelector(cardTypeSelect);
          await page.select(cardTypeSelect, cardValue);

          const franchiseeSelect = '#merNo';
          await page.waitForSelector(franchiseeSelect);
          await page.waitForSelector(
            `option[value="${info.franchiseNumber}"]`,
            { timeout: 5000 },
          );
          await page.select(franchiseeSelect, info.franchiseNumber);
          /* 카드사별 가맹점 선택 */

          const result = await searchAndDownload(filePath);
          if (!result) {
            continue;
          }

          filePaths.push(filePath);
        }
      }

      // 전체 가맹점으로 처리
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

      this.logger.log(
        `>>>>> 여신 금융 승인내역 거래내역조회 크롤링 종료: ${requestId}`,
      );

      return filePaths;
    } catch (error) {
      this.logger.error(
        `>>>>> 여신 금융 승인내역 거래내역조회 크롤링 오류 ${requestId}`,
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
