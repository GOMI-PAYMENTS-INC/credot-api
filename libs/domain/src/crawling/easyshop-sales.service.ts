import { CrawlingDataType } from '@app/domain/crawling';
import { parseCardCompanyName } from '@app/utils';
import { PrismaService } from '@app/utils/prisma';

import { Injectable, Logger } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import {
  ApprovalType,
  CardCompanyName,
  CardType,
  VanType,
} from '@prisma/client';
import * as dayjs from 'dayjs';
import * as Excel from 'exceljs';
import * as fs from 'fs';
import puppeteer from 'puppeteer';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class EasyshopSalesService {
  private readonly logger = new Logger(EasyshopSalesService.name);

  constructor(private prisma: PrismaService) {}

  async loadData({ filePath, requestId, userId }): Promise<void> {
    this.logger.log(`>>>> 크롤링 데이터 적재 시작 ${requestId}`);
    try {
      const workbook = new Excel.Workbook();
      await workbook.xlsx.readFile(filePath);
      const sheet = workbook.worksheets[0];
      const headers = [
        null,
        '거래고유번호',
        '승인구분',
        '거래일시▼',
        '단말기번호',
        '카드번호',
        '카드구분',
        '발급카드사',
        '매입카드사',
        '가맹점번호',
        '금액',
        '할부개월',
        '승인번호',
        '키인',
        '원승인일자',
        '입금예정일',
        '승인결과',
        '전자서명',
        '수수료',
        '입금예정금액',
        '봉사료',
      ];

      const headerIndex = 1;
      const indexInfo = {
        transactionId: 1,
        cardCompanyName: 8,
        transactionAt: 3,
        affiliateStoreNumber: 9,
        cardNumber: 5,
        cardType: 6,
        approvalType: 2,
        approvalNumber: 12,
        depositAt: 15,
        depositAmount: 19,
        approvalAmount: 10,
        claimingResult: 16,
        installmentPeriod: 11,
        commission: 18,
        claimingAt: 14,
        terminalNumber: 4,
        vanType: 22,
      };

      const headerRow = sheet?.getRow(headerIndex);
      if (JSON.stringify(headers) !== JSON.stringify(headerRow.values)) {
        throw new RuntimeException(
          `유효하지 않은 엑셀 양식입니다. ${JSON.stringify(headerRow.values)}`,
        );
      }

      const records: {
        transactionId: string;
        transactionAt: Date;
        affiliateStoreNumber: string;
        cardNumber: string;
        cardCompanyName: CardCompanyName;
        cardType: CardType;
        approvalType: ApprovalType;
        approvalNumber: string;
        approvalAmount: number;
        claimingResult: string;
        claimingAt: string;
        depositAt: string;
        depositAmount: number;
        installmentPeriod: string;
        commission: number;
        terminalNumber: string;
        vanType: VanType;
        userId: number;
      }[] = [];

      sheet?.eachRow((row, rowIndex) => {
        if (rowIndex > headerIndex) {
          const rowValues = JSON.parse(JSON.stringify(row.values));
          const approvalType =
            rowValues[indexInfo.approvalType] === '승인'
              ? ApprovalType.APPROVED
              : ApprovalType.CANCEL;
          const isApproved = approvalType === ApprovalType.APPROVED;
          // 승인: + / 취소: -
          const approvalAmount = isApproved
            ? rowValues[indexInfo.approvalAmount]
            : rowValues[indexInfo.approvalAmount] * -1;
          const depositAmount = isApproved
            ? rowValues[indexInfo.depositAmount]
            : rowValues[indexInfo.depositAmount] * -1;
          const commission = isApproved
            ? rowValues[indexInfo.commission] * -1
            : rowValues[indexInfo.commission];
          const cardType =
            rowValues[indexInfo.cardType] === '신용'
              ? CardType.CREDIT
              : CardType.CHECK;

          records.push({
            userId,
            transactionId: rowValues[indexInfo.transactionId],
            transactionAt: dayjs(rowValues[indexInfo.transactionAt]).toDate(),
            affiliateStoreNumber: rowValues[indexInfo.affiliateStoreNumber],
            cardNumber: rowValues[indexInfo.cardNumber],
            cardCompanyName: parseCardCompanyName(
              rowValues[indexInfo.cardCompanyName],
            ),
            cardType,
            approvalType,
            approvalNumber: rowValues[indexInfo.approvalNumber],
            approvalAmount,
            claimingResult: rowValues[indexInfo.claimingResult],
            depositAmount,
            installmentPeriod: rowValues[indexInfo.installmentPeriod],
            commission,
            terminalNumber: rowValues[indexInfo.terminalNumber],
            vanType: VanType.KICC,
            claimingAt: dayjs(
              rowValues[indexInfo.claimingAt],
              'YYYY-MM-DD',
            ).isValid()
              ? rowValues[indexInfo.claimingAt]
              : null,
            depositAt: dayjs(
              rowValues[indexInfo.claimingAt],
              'YYYY-MM-DD',
            ).isValid()
              ? rowValues[indexInfo.claimingAt]
              : null,
          });
        }
      });

      await this.prisma.bond.createMany({
        data: records,
        skipDuplicates: true,
      });

      fs.unlinkSync(filePath);
      this.logger.log(`>>>> 크롤링 데이터 적재 종료 ${requestId}`);
    } catch (error) {
      this.logger.log(`>>>> 크롤링 데이터 적재 실패 ${requestId}`);
      throw new RuntimeException(error);
    }
  }

  async crawling({ filePath, requestId, loginId, password }: CrawlingDataType) {
    const downloadPath = `./files/${filePath}/`;
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath);
    }
    this.logger.log(`>>>>> 이지샵 거래내역조회 크롤링 시작: ${requestId}`);
    const browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      headless: true,
      args: ['--no-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1480, height: 1024 });
      await page.goto(`https://www.easyshop.co.kr/taxLogn/taxLognLogin.kicc`);

      // 로그인 버튼 대기
      const loginButtonSelector = '.ez_btn';
      await page.waitForSelector(loginButtonSelector);

      // 로그인 시작
      await page.type('#user_id', loginId);
      await page.type('#password', password);
      await page.click(loginButtonSelector);

      // 카드 매출 관리 대기 및 클릭
      const popupSelector = '#popupLayer';
      await page.waitForSelector(popupSelector, {
        visible: true,
        timeout: 2000,
      });
      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window?.startLogRegist();
      });

      // 탭 이동
      let tabCreated = false;
      while (!tabCreated) {
        await delay(1000);
        tabCreated = (await browser.pages()).length === 3;
      }

      const cardPage = (await browser.pages())[2];
      await cardPage.setViewport({ width: 1480, height: 1024 });
      cardPage.on('dialog', async (dialog) => {
        await dialog.accept();
      });
      const client = await cardPage.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath,
      });

      // 카드 페이지 대기
      const logoSelector =
        '#mainframe_VFrameSet_HFrameSet_LeftFrame_form_divLeft_st_nexa';
      await cardPage.waitForSelector(logoSelector);

      // 거래 내역 조회 클릭
      const menuSelector =
        '#mainframe_VFrameSet_HFrameSet_LeftFrame_form_divLeft_grd_menu_body_gridrow_6_cell_6_0_controltreeTextBoxElement';
      await cardPage.waitForSelector(menuSelector);
      await cardPage.click(menuSelector, { count: 2 });

      // 1달 클릭
      // const weekFilterSelector =
      //   '#mainframe_VFrameSet_HFrameSet_VFrameSet1_WorkFrame_1000007726_form_Div00_div_Work_tab_tabpage1_divSearch_btn1MonthAgoTextBoxElement';
      // 1주 클릭
      const weekFilterSelector =
        '#mainframe_VFrameSet_HFrameSet_VFrameSet1_WorkFrame_1000007726_form_Div00_div_Work_tab_tabpage1_divSearch_btn1WeekAgo01TextBoxElement';
      await cardPage.waitForSelector(weekFilterSelector);
      await cardPage.click(weekFilterSelector);

      // 검색 클릭
      const searchSelector =
        '#mainframe_VFrameSet_HFrameSet_VFrameSet1_WorkFrame_1000007726_form_Div00_div_Work_tab_tabpage1_divSearch_btnSrchTextBoxElement';
      await cardPage.waitForSelector(searchSelector);
      await cardPage.click(searchSelector);

      while (true) {
        const searchResultSelector =
          '#mainframe_VFrameSet_HFrameSet_VFrameSet1_WorkFrame_1000007726_form_Div00_div_Work_tab_tabpage1_grdSummary_body_gridrow_0_cell_0_5GridCellTextContainerElement';
        const element = await cardPage.waitForSelector(searchResultSelector);
        const result = await element?.evaluate((item) => {
          return item.children[0].innerHTML;
        });
        if (result) {
          break;
        }
        await delay(1000);
      }

      // 대기 후 다운로드 클릭
      await delay(1000);

      // 다운로드 버튼 클릭
      const excelSelector =
        '#mainframe_VFrameSet_HFrameSet_VFrameSet1_WorkFrame_1000007726_form_Div00_div_Work_tab_tabpage1_divSearch_btnExcelTextBoxElement';
      await cardPage.waitForSelector(excelSelector);
      await cardPage.click(excelSelector);

      // 대기
      while (!fs.existsSync(`./files/${filePath}/신용거래내역조회.xlsx`)) {
        await delay(1000);
      }
      this.logger.log(`>>>>> 이지샵 거래내역조회 크롤링 종료: ${requestId}`);
    } catch (error) {
      this.logger.error(`>>>>> 이지샵 거래내역조회 크롤링 오류 ${requestId}`);
      this.logger.error(error);
      throw new RuntimeException(error);
    } finally {
      await browser.close();
    }
  }
}
