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
import * as Excel from 'exceljs';
import * as fs from 'fs';
import puppeteer from 'puppeteer';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class EasyshopDepositService {
  private readonly logger = new Logger(EasyshopDepositService.name);

  constructor(private prisma: PrismaService) {}

  async loadData({ filePath, requestId, userId }): Promise<void> {
    this.logger.log(`>>>> 크롤링 데이터 적재 시작 ${requestId}`);
    try {
      const workbook = new Excel.Workbook();
      await workbook.xlsx.readFile(filePath);
      const sheet = workbook.worksheets[0];
      const headers = [
        null,
        '카드사',
        '거래일자',
        '사업자등록번호',
        '가맹점번호',
        '카드번호',
        '카드종류',
        '승인구분',
        '승인번호',
        '승인금액',
        '청구결과',
        '할부기간',
        '수수료',
        '부가세',
        '청구일자',
        '입금예정일',
        '입금예정금액',
        '단말기번호',
        '단말기명',
        '카드사반송코드',
        'KICC반송코드',
        '반송사유상세내역',
        'VAN구분',
      ];

      const headerIndex = 4;
      const indexInfo = {
        cardCompanyName: 1,
        transactionAt: 2,
        businessRegistrationNumber: 3,
        affiliateStoreNumber: 4,
        cardNumber: 5,
        cardType: 6,
        approvalType: 7,
        approvalNumber: 8,
        approvalAmount: 9,
        claimingResult: 10,
        installmentPeriod: 11,
        commission: 12,
        vat: 13,
        claimingAt: 14,
        depositAt: 15,
        depositAmount: 16,
        terminalNumber: 17,
        terminalName: 18,
        cardRejectCode: 19,
        kiccRejectCode: 20,
        rejectDetails: 21,
        vanType: 22,
      };

      const headerRow = sheet?.getRow(4);
      if (JSON.stringify(headers) !== JSON.stringify(headerRow.values)) {
        throw new RuntimeException('유효하지 않은 엑셀 양식입니다.');
      }

      const records: {
        transactionAt: string;
        affiliateStoreNumber: string;
        cardNumber: string;
        cardCompanyName: CardCompanyName;
        cardType: CardType;
        approvalType: ApprovalType;
        approvalNumber: string;
        approvalAmount: number;
        claimingResult: string;
        claimingAt: string;
        installmentPeriod: string;
        vat: number;
        commission: number;
        depositAt: string;
        depositAmount: number;
        terminalNumber: string;
        terminalName: string;
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

          // 승인: - / 취소: +
          const vat = isApproved
            ? rowValues[indexInfo.vat] * -1
            : rowValues[indexInfo.vat];
          const commission = isApproved
            ? rowValues[indexInfo.commission] * -1
            : rowValues[indexInfo.commission];

          records.push({
            userId,
            transactionAt: rowValues[indexInfo.transactionAt],
            affiliateStoreNumber: rowValues[indexInfo.affiliateStoreNumber],
            cardNumber: rowValues[indexInfo.cardNumber],
            cardCompanyName: parseCardCompanyName(
              rowValues[indexInfo.cardCompanyName],
            ),
            cardType:
              rowValues[indexInfo.cardType] === '신용'
                ? CardType.CREDIT
                : CardType.CHECK,
            approvalType,
            approvalNumber: rowValues[indexInfo.approvalNumber],
            approvalAmount,
            claimingResult: rowValues[indexInfo.claimingResult],
            claimingAt: rowValues[indexInfo.claimingAt],
            installmentPeriod: rowValues[indexInfo.installmentPeriod],
            vat,
            commission,
            depositAt: rowValues[indexInfo.depositAt],
            depositAmount,
            terminalNumber: rowValues[indexInfo.terminalNumber],
            terminalName: rowValues[indexInfo.terminalName],
            vanType: VanType.KICC,
          });
        }
      });

      await this.prisma.bondDeposit.createMany({
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

  async loginCheck({
    requestId,
    loginId,
    password,
  }: CrawlingDataType): Promise<boolean> {
    this.logger.log(`>>>>> 이지샵 로그인 체크 크롤링 시작: ${requestId}`);
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
      this.logger.log(`>>>>> 이지샵 로그인 체크 크롤링 종료: ${requestId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `>>>>> 이지샵 로그인 체크 크롤링 종료(에러) ${requestId}`,
      );
      this.logger.error(error);
      return false;
    } finally {
      await browser.close();
    }
  }

  async crawling({ filePath, requestId, loginId, password }: CrawlingDataType) {
    const downloadPath = `./files/${filePath}/`;
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath);
    }
    this.logger.log(`>>>>> 이지샵 매출/입금내역 크롤링 시작: ${requestId}`);
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
        '#mainframe_VFrameSet_HFrameSet_LeftFrame_form_divLeft_grd_menu_body_gridrow_15_cell_15_0_controltreeTextBoxElement';
      await cardPage.waitForSelector(menuSelector);
      await cardPage.click(menuSelector, { count: 2 });

      // 일별상세조회 클릭
      const dailyDetailSelector =
        '#mainframe_VFrameSet_HFrameSet_VFrameSet1_WorkFrame_1000007748_form_Div00_div_Work_tab_tabpage4_tabbuttonTextBoxElement';
      await cardPage.waitForSelector(dailyDetailSelector);
      await cardPage.click(dailyDetailSelector);

      // 1주 클릭
      const weekFilterSelector =
        '#mainframe_VFrameSet_HFrameSet_VFrameSet1_WorkFrame_1000007748_form_Div00_div_Work_tab_tabpage4_Div00_divSearch_divSrchDt_btn1WeekAgoTextBoxElement';
      await cardPage.waitForSelector(weekFilterSelector);
      await cardPage.click(weekFilterSelector);

      // 미래 입금 정보를 위한 미래 기간 설정
      while (true) {
        const dateFilterSelector =
          '#mainframe_VFrameSet_HFrameSet_VFrameSet1_WorkFrame_1000007748_form_Div00_div_Work_tab_tabpage4_Div00_divSearch_divSrchDt_calToDt_dropbutton';
        await cardPage.waitForSelector(dateFilterSelector);
        await cardPage.click(dateFilterSelector);

        const lastDateFilterSelector = `
      #mainframe_VFrameSet_HFrameSet_VFrameSet1_WorkFrame_1000007748_form_Div00_div_Work_tab_tabpage4_Div00_divSearch_divSrchDt_calToDt_popupcalendar_body_daystatic:last-child
    `;
        const lastDateFilterSelectElements = await cardPage.waitForSelector(
          lastDateFilterSelector,
        );
        lastDateFilterSelectElements?.click();

        await delay(500);

        const clickedDateSelector = `#mainframe_VFrameSet_HFrameSet_VFrameSet1_WorkFrame_1000007748_form_Div00_div_Work_tab_tabpage4_Div00_divSearch_divSrchDt_calToDt_popupcalendar_body_daystatic:nth-child(22)`;
        const element = await cardPage.waitForSelector(clickedDateSelector);
        const result = await element?.evaluate((el) =>
          el.getAttribute('style'),
        );

        // 기간 설정 후 스타일 변경으로 감지
        const styleChanged = result?.indexOf('rgb(202, 230, 247)') || -1;
        if (styleChanged > -1) {
          break;
        }
        await delay(1000);
      }

      // 검색 클릭
      const searchSelector =
        '#mainframe_VFrameSet_HFrameSet_VFrameSet1_WorkFrame_1000007748_form_Div00_div_Work_tab_tabpage4_Div00_divSearch_btnSearchTextBoxElement';
      await cardPage.waitForSelector(searchSelector);
      await cardPage.click(searchSelector);

      // 대기 후 다운로드 클릭
      await delay(1000);

      // 다운로드 버튼 클릭
      const excelSelector =
        '#mainframe_VFrameSet_HFrameSet_VFrameSet1_WorkFrame_1000007748_form_Div00_div_Work_tab_tabpage4_Div00_divSearch_btnExcelTextBoxElement';
      await cardPage.waitForSelector(excelSelector);
      await cardPage.click(excelSelector);
      this.logger.log(`>>>>> 이지샵 매출/입금내역 크롤링 종료: ${requestId}`);

      // 대기
      while (!fs.existsSync(`./files/${filePath}/입금현황 - 일별상세.xlsx`)) {
        await delay(1000);
      }
    } catch (error) {
      this.logger.error(`>>>>> 이지샵 매출/입금내역 크롤링 오류 ${requestId}`);
      this.logger.error(error);
      throw new RuntimeException(error);
    } finally {
      await browser.close();
    }
  }
}
