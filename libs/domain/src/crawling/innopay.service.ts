import { generateTransactionId } from '@app/domain/crawling/crawling.helper';
import {
  BondRecordType,
  CrawlingDataType,
} from '@app/domain/crawling/crawling.type';
import { delay, parseCardCompanyName } from '@app/utils';
import { PrismaService } from '@app/utils/prisma';

import { Injectable, Logger } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { ApprovalType, CardType } from '@prisma/client';
import * as dayjs from 'dayjs';
import * as Excel from 'exceljs';
import * as fs from 'fs';
import puppeteer from 'puppeteer';
import * as XLSX from 'xlsx';

@Injectable()
export class InnopayService {
  private readonly logger = new Logger(InnopayService.name);

  constructor(private readonly prisma: PrismaService) {}

  async crawling({
    requestId,
    loginId,
    filePath,
    password,
  }: CrawlingDataType): Promise<string | null> {
    this.logger.log(`>>>>> 이노페이 크롤링 시작: ${requestId}`);

    const downloadPath = `./files/${filePath}/`;
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath);
    }

    const browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      headless: true,
      args: ['--no-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1480, height: 1024 });
      await page.goto(`https://admin.innopay.co.kr/mer/Login.do`);

      const client = await page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath,
      });

      // 로그인 버튼 대기
      const loginButtonSelector = '.login_btn > a:last-child';
      await page.waitForSelector(loginButtonSelector);

      // 로그인 시작
      await page.type('.id > input', loginId);
      await page.type('.pw > input', password);
      await page.click(loginButtonSelector);

      const gnbSelector = '.gnb';
      await page.waitForSelector(gnbSelector);

      // 거래 내역 조회로 이동
      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        moveMenu('/trans/TransDownLoadForm.do');
      });

      const titleSelector = '.main .title';
      await page.waitForSelector(titleSelector);

      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        getMaskCalcMonth('frDt', 'toDt', -1);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        reqSer(0);
      });

      const contentTable = '#gbox_list';
      await page.waitForSelector(contentTable);

      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        reqExcel();
      });

      // 대기
      while (!fs.readdirSync(`./files/${filePath}`).length) {
        await delay(1000);
      }
      const [fileName] = fs.readdirSync(`./files/${filePath}`);

      this.logger.log(`>>>>> 이노페이 크롤링 완료: ${requestId}`);
      return fileName;
    } catch (error) {
      this.logger.error(`>>>>> 이노페이 크롤링 종료(에러) ${requestId}`);
      this.logger.error(error);
      return null;
    } finally {
      await browser.close();
    }
  }

  async loadData({ filePath, requestId, userId }): Promise<void> {
    this.logger.log(`>>>> 이노페이 거래내역 데이터 적재 시작 ${requestId}`);
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
        'TID',
        '지불수단',
        '거래상태',
        '승인일자',
        '승인시간',
        '취소일자',
        '취소시간',
        '구매자명',
        '결제금액',
        '상품명',
        '승인번호',
        '결제요청일자',
        '결제요청시간',
        '카드사',
      ];

      const headerIndex = 1;
      const indexInfo = {
        storeName: 1,
        transactionAt: 4,
        transactionAtHour: 5,
        cancelAt: 6,
        cancelAtHour: 7,
        approvalAmount: 9,
        approvalNumber: 11,
        cardCompanyName: 14,
        approvalType: 3,
      };

      const headerRow = sheet?.getRow(headerIndex);
      if (JSON.stringify(headers) !== JSON.stringify(headerRow.values)) {
        throw new RuntimeException(
          `이노페이: 유효하지 않은 엑셀 양식입니다. ${JSON.stringify(
            headerRow.values,
          )}`,
        );
      }

      const records: BondRecordType[] = [];
      sheet?.eachRow((row, rowIndex) => {
        if (rowIndex > headerIndex) {
          const rowValues = JSON.parse(JSON.stringify(row.values));
          if (rowValues[indexInfo.approvalNumber] === '내역이 없습니다') {
            return;
          }

          if (rowValues[indexInfo.storeName] === '합계') {
            return;
          }

          const approvalType: ApprovalType = rowValues[
            indexInfo.approvalType
          ].includes('취소')
            ? ApprovalType.CANCEL
            : ApprovalType.APPROVED;
          const approvalNumber = `${rowValues[indexInfo.approvalNumber]}`;
          const approvalAmount: number =
            approvalType === ApprovalType.APPROVED
              ? rowValues[indexInfo.approvalAmount]
              : rowValues[indexInfo.approvalAmount] * -1;
          const cardNumber = '';
          const cardType = CardType.CREDIT;

          const transactionAt = dayjs(
            `${rowValues[indexInfo.transactionAt].substr(0, 10)} ${
              rowValues[indexInfo.transactionAtHour]
            }`,
            'YYYY-MM-DD HHmmss',
          ).isValid()
            ? dayjs(
                `${rowValues[indexInfo.transactionAt].substr(0, 10)} ${
                  rowValues[indexInfo.transactionAtHour]
                }`,
                'YYYY-MM-DD HHmmss',
              )
            : null;
          const transactionId = generateTransactionId({
            transactionAtDate: transactionAt?.format('YYYY-MM-DD') || '',
            approvalType,
            approvalNumber,
            approvalAmount,
          });

          records.push({
            userId,
            transactionId,
            cardNumber,
            cardType,
            approvalType,
            approvalNumber,
            approvalAmount,
            transactionAt: transactionAt?.toDate(),
            cardCompanyName: parseCardCompanyName(
              rowValues[indexInfo.cardCompanyName],
            ),
            originalCardCompanyName: rowValues[indexInfo.cardCompanyName],
            installmentPeriod: null,
          });
        }
      });
      if (!records.length) {
        return;
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
            transactionAt: true,
            approvalType: true,
          },
        });
        const existTransactionIds = existList.map(
          (exist) => exist.transactionId,
        );

        // 레코드는 존재하지만 승인 타입이 다를 경우 수정한다.
        const updateList = records.filter(
          (record) =>
            existTransactionIds.includes(record.transactionId) &&
            existList.find(
              (item) => item.transactionId === record.transactionId,
            ).approvalType !== record.approvalType,
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
          `>>>> 이노페이 거래내역 데이터 적재 종료 ${requestId} 생성: ${
            createList.length || 0
          }, 수정: ${updateList.length || 0}`,
        );
      });
    } catch (error) {
      this.logger.log(`>>>> 이노페이 거래내역 데이터 적재 실패 ${requestId}`);
      throw new RuntimeException(error);
    }
  }
}
