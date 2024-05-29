import { CrawlingDataType } from '@app/domain/crawling/crawling.type';
import { delay } from '@app/utils';
import { GoogleGmailService } from '@app/utils/google';
import { PrismaService } from '@app/utils/prisma';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as dayjs from 'dayjs';
import puppeteer from 'puppeteer';

function parseCSSString(cssString: string) {
  const cssObject: { [key: string]: any } = {};
  const declarations = cssString.split(';');

  for (let i = 0; i < declarations.length; i += 1) {
    const declaration = declarations[i].trim();
    if (declaration) {
      const parts = declaration.split(':');
      const property = parts[0].trim();
      cssObject[property] = parts[1].trim();
    }
  }

  return cssObject;
}

const MAX_RETRY = 30;

@Injectable()
export class InnopaySecondaryAuthService {
  private readonly logger = new Logger(InnopaySecondaryAuthService.name);

  constructor(
    private readonly googleGmailService: GoogleGmailService,
    private readonly prisma: PrismaService,
  ) {}

  async getSecondaryAuthCode(requestDate: dayjs.Dayjs): Promise<string | null> {
    const tokenInfo = await this.prisma.auth.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });
    if (tokenInfo?.status !== 'ACTIVE') {
      throw new BadRequestException('유효하지 않는 구글 토큰입니다.');
    }

    let recentMessage = null;
    try {
      recentMessage = await this.googleGmailService.getRecentMessage({
        refreshToken: tokenInfo.refreshToken,
      });
    } catch (error) {
      this.logger.error(error);
      await this.prisma.auth.update({
        where: {
          id: tokenInfo.id,
        },
        data: {
          status: 'EXPIRE',
        },
      });
    }

    if (!recentMessage) {
      return null;
    }

    const isThreadArrived =
      recentMessage.snippet.indexOf('가맹점 관리자 로그인 2차인증') > -1;
    if (!isThreadArrived) {
      return null;
    }

    // 초까지만 비교
    if (
      requestDate
        .set('milliseconds', 0)
        .isAfter(dayjs(recentMessage.date).set('milliseconds', 0), 'seconds')
    ) {
      return null;
    }

    // 정규표현식을 사용하여 "인증코드" 다음에 나오는 숫자 추출
    const match = recentMessage.snippet.match(/인증코드 (\d+)/);
    return match ? match[1] : null;
  }

  async crawling({
    requestId,
    loginId,
    password,
  }: CrawlingDataType): Promise<boolean> {
    this.logger.log(`>>>>> 이노페이 2차 인증 체크 크롤링 시작: ${requestId}`);
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
      await page.goto(`https://admin.innopay.co.kr/mer/Login.do`);

      // 팝업
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });

      // 로그인 버튼 대기
      const loginButtonSelector = '.login_btn > a:last-child';
      await page.waitForSelector(loginButtonSelector);

      // 로그인 시작
      await page.type('.id > input', loginId);
      await page.type('.pw > input', password);
      await page.click(loginButtonSelector);

      const certificationSelector = '.certification';
      const certificationElement = await page.waitForSelector(
        certificationSelector,
      );

      let retry = 0;
      let isRequestSecondaryCertification = false;
      while (retry < MAX_RETRY) {
        const strStyles =
          (await certificationElement?.evaluate((el) => {
            return el.getAttribute('style') || '';
          })) || '';
        const styles = parseCSSString(strStyles);
        if (styles['display'] !== 'none') {
          isRequestSecondaryCertification = true;
          break;
        }

        await delay(1000);
        retry += 1;
      }

      if (!isRequestSecondaryCertification) {
        this.logger.log(`>>>>> 이노페이 2차 인증이 이미 완료 : ${requestId}`);
        return;
      }

      // 이메일 인증 방식 선택
      const emailSelector = '#radio1-2';
      await page.click(emailSelector);

      const requestDate = dayjs();
      const sentBtnSelector = '#send_btn';
      await page.click(sentBtnSelector);

      let authCode = null;
      retry = 0;
      while (retry < MAX_RETRY) {
        await delay(2000);
        authCode = await this.getSecondaryAuthCode(requestDate);
        if (authCode) {
          break;
        }
        retry += 1;
      }
      if (!authCode) {
        this.logger.log(
          `>>>>> 이노페이 2차 인증 실패 - 이메일에서 확인할 수 없음 (시간 초과): ${requestId}`,
        );
      }

      this.logger.log(
        `>>>>> 이노페이 2차 인증 번호 ${authCode} : ${requestId}`,
      );
      const codeInputSelector = '#ctf_num';
      await page.type(codeInputSelector, authCode);

      const submitSelector = '#s_save';
      await page.click(submitSelector);

      const gnbSelector = '.gnb';
      await page.waitForSelector(gnbSelector, {
        timeout: 5000,
      });
      this.logger.log(`>>>>> 이노페이 2차 인증 성공 종료: ${requestId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `>>>>> 이노페이 2차 인증 크롤링 종료(에러) ${requestId}`,
      );
      this.logger.error(error);
      return false;
    } finally {
      await browser.close();
    }
  }
}
