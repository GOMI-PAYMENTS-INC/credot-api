import { CardCompanyName, PrefundStatus } from '@prisma/client';
import { boolean } from 'joi';

export * from './utils.module';

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function removeEscapeSequences(input: string): string {
  return input.replace(/[\b]|[\t]|[\r]|[\n]/g, '');
}

export function exposePrefundStatus(prefundStatus: PrefundStatus) {
  if (prefundStatus === PrefundStatus.READY) {
    return '입금 대기';
  }

  if (prefundStatus === PrefundStatus.DEPOSIT_DONE) {
    return '입금 완료';
  }

  if (prefundStatus === PrefundStatus.DONE) {
    return '완료';
  }

  return '-';
}

export function parsePrefundStatus(
  prefundStatus: string | '입금 대기' | '입금 완료' | '완료',
) {
  if (prefundStatus === '입금 대기') {
    return PrefundStatus.READY;
  }

  if (prefundStatus === '입금 완료') {
    return PrefundStatus.DEPOSIT_DONE;
  }

  if (prefundStatus === '완료') {
    return PrefundStatus.DONE;
  }

  return PrefundStatus.READY;
}

export function exposeCardCompanyName(
  cardCompanyName: CardCompanyName,
): string {
  switch (cardCompanyName) {
    case CardCompanyName.BC_CARD:
      return '비씨카드';
    case CardCompanyName.KB_CARD:
      return 'KB국민카드';
    case CardCompanyName.HANA_CARD:
      return '하나카드';
    case CardCompanyName.SHINHAN_CARD:
      return '신한카드';
    case CardCompanyName.HYUNDAE_CARD:
      return '현대카드';
    case CardCompanyName.SAMSUNG_CARD:
      return '삼성카드';
    case CardCompanyName.NH_CARD:
      return 'NH카드';
    case CardCompanyName.LOTTE_CARD:
      return '롯데카드';
    case CardCompanyName.WOORI_CARD:
      return '우리카드';
    case CardCompanyName.HDO_CARD:
      return '디지털상품권(HDO)';
    default:
      return '';
  }
}

export function parseCardCompanyName(
  cardCompanyName: string,
): CardCompanyName | null {
  const BC_CARD_ALIAS_LIST = ['비씨카드', '비씨'];
  const KB_CARD_ALIAS_LIST = ['KB국민카드', 'KB카드', 'KB', '국민'];
  const HANA_CARD_ALIAS_LIST = ['하나구외환', '하나카드', '하나'];
  const HYUNDAE_CARD_ALIAS_LIST = ['현대카드', '현대'];
  const SHINHAN_CARD_ALIAS_LIST = ['신한카드', '신한'];
  const SAMSUNG_CARD_ALIAS_LIST = ['삼성카드', '삼성'];
  const WOORI_CARD_ALIAS_LIST = ['우리카드', '우리'];
  const NH_CARD_ALIAS_LIST = ['NH카드', '농협NH카드', 'NH', '농협'];
  const LOTTE_CARD_ALIAS_LIST = ['롯데카드', '롯데'];
  const HDO_CARD_ALIAS_LIST = ['디지털상품권(HDO)'];

  if (BC_CARD_ALIAS_LIST.includes(cardCompanyName)) {
    return CardCompanyName.BC_CARD;
  }

  if (KB_CARD_ALIAS_LIST.includes(cardCompanyName)) {
    return CardCompanyName.KB_CARD;
  }

  if (HANA_CARD_ALIAS_LIST.includes(cardCompanyName)) {
    return CardCompanyName.HANA_CARD;
  }

  if (SHINHAN_CARD_ALIAS_LIST.includes(cardCompanyName)) {
    return CardCompanyName.SHINHAN_CARD;
  }

  if (HYUNDAE_CARD_ALIAS_LIST.includes(cardCompanyName)) {
    return CardCompanyName.HYUNDAE_CARD;
  }

  if (SAMSUNG_CARD_ALIAS_LIST.includes(cardCompanyName)) {
    return CardCompanyName.SAMSUNG_CARD;
  }

  if (NH_CARD_ALIAS_LIST.includes(cardCompanyName)) {
    return CardCompanyName.NH_CARD;
  }

  if (LOTTE_CARD_ALIAS_LIST.includes(cardCompanyName)) {
    return CardCompanyName.LOTTE_CARD;
  }

  if (HDO_CARD_ALIAS_LIST.includes(cardCompanyName)) {
    return CardCompanyName.HDO_CARD;
  }

  if (WOORI_CARD_ALIAS_LIST.includes(cardCompanyName)) {
    return CardCompanyName.WOORI_CARD;
  }

  return null;
}

export const isZeroServiceCommission = (businessDay: number) =>
  businessDay === 0;

export const getEnvName = (): string => {
  if (process.env.NODE_ENV === 'prod') {
    return '.env';
  }

  if (process.env.NODE_ENV === 'dev') {
    return '.env.dev';
  }

  return '.env.local';
};

export const number = (value: number | undefined): number => {
  return value || 0;
};

export const retry = async (
  count: number,
  callback: () => Promise<boolean>,
  options?: { timeout: number; errorMessage: string },
): Promise<boolean> => {
  let i = 0;
  let result = false;
  while (true) {
    result = await callback();
    if (result) {
      break;
    }

    i += 1;
    if (i >= count) {
      throw new Error(
        options?.errorMessage ||
          `최대 재시도 횟수를 초과하였습니다. count: ${count}`,
      );
    }

    await delay(options?.timeout || 1000);
  }

  return result;
};
