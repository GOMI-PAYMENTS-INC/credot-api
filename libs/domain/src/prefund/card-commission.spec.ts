import { CardType } from '@prisma/client';
import * as dayjs from 'dayjs';

import { CardCommission } from './card-commission';

describe('CardCommission', () => {
  describe('calculateGomiCommission', () => {
    it('신용카드, 신용카드 수수료 3%, 매출액 30,000, 카드수수료 0 일 경우 그리고 카드 수수료는 -900 이다.', () => {
      // given
      const cardType = CardType.CREDIT;
      const cardRate = { check: 0, credit: 0.03 };
      const salesPrice = 30000;
      const commission = 0;

      // when
      const gomiCommission = CardCommission.calculateCardCommission({
        salesPrice,
        commission,
        cardType,
        cardRate,
      });

      expect(gomiCommission).toBe(-900);
    });

    it('매출액 30,000, 카드수수료 -900 일 경우 이미 카드 수수료에 대한 정보기 있기 때문에 수수료/카드타입과 상관없이 그대로 -900이다.', () => {
      // given
      const cardType = CardType.CREDIT;
      const cardRate = { check: 0, credit: 0 };
      const salesPrice = 30000;
      const commission = -900;

      // when
      const gomiCommission = CardCommission.calculateCardCommission({
        salesPrice,
        commission,
        cardType,
        cardRate,
      });

      expect(gomiCommission).toBe(-900);
    });
  });

  describe('getCardBusinessDay', () => {
    describe('영업일 기준이 아닐 때', () => {
      it('매출 발생 날짜: 2023-11-03(금), 기본 정산일 2일(영업일 X), 휴일이 2일(토, 일), 대체휴일이(월, 화) 겹치면 최종 정산일은 5일이다.', () => {
        // given
        const transactionAt = dayjs('2023-11-03');
        const defaultBusinessDay = 2;
        const substituteHolidayList: string[] = ['2023-11-06', '2023-11-07'];

        // when
        const businessDay = CardCommission.getCardBusinessDay({
          transactionAt,
          defaultBusinessDay,
          substituteHolidayList,
          byBusinessDay: false,
        });

        expect(businessDay).toBe(5);
      });

      it('매출 발생 날짜: 2023-10-29(일), 기본 정산일 2일(영업일 X), 휴일이 2일(토, 일) 겹칠 경우 최종 정산일은 2일이다.', () => {
        // given
        const transactionAt = dayjs('2023-10-29');
        const defaultBusinessDay = 2;
        const substituteHolidayList: string[] = [];

        // when
        const businessDay = CardCommission.getCardBusinessDay({
          transactionAt,
          defaultBusinessDay,
          substituteHolidayList,
          byBusinessDay: false,
        });

        expect(businessDay).toBe(2);
      });

      it('매출 발생 날짜: 2023-10-28(토), 기본 정산일 2일(영업일 X), 휴일이 2일(토, 일) 겹칠 경우 최종 정산일은 2일이다.', () => {
        // given
        const transactionAt = dayjs('2023-10-28');
        const defaultBusinessDay = 2;
        const substituteHolidayList: string[] = [];

        // when
        const businessDay = CardCommission.getCardBusinessDay({
          transactionAt,
          defaultBusinessDay,
          substituteHolidayList,
          byBusinessDay: false,
        });

        expect(businessDay).toBe(2);
      });

      it('매출 발생 날짜: 2023-10-26(목), 기본 정산일 2일(영업일 X), 휴일이 2일(토, 일) 겹칠 경우 최종 정산일은 4일이다.', () => {
        // given
        const transactionAt = dayjs('2023-10-26');
        const defaultBusinessDay = 2;
        const substituteHolidayList: string[] = [];

        // when
        const businessDay = CardCommission.getCardBusinessDay({
          transactionAt,
          defaultBusinessDay,
          substituteHolidayList,
          byBusinessDay: false,
        });

        expect(businessDay).toBe(4);
      });

      it('매출 발생 날짜: 2023-10-30(월), 기본 정산일 2일(영업일 X), 대체휴일이 없을 경우 최종 정산일은 2일이다.', () => {
        // given
        const transactionAt = dayjs('2023-10-30');
        const defaultBusinessDay = 2;
        const substituteHolidayList: string[] = [];

        // when
        const businessDay = CardCommission.getCardBusinessDay({
          transactionAt,
          defaultBusinessDay,
          substituteHolidayList,
          byBusinessDay: false,
        });

        expect(businessDay).toBe(2);
      });
    });

    describe('영업일 기준일 때', () => {
      it('매출 발생 날짜: 2023-10-30(월), 기본 정산일 2(영업일 O), 대체휴일이 없을 경우 최종 정산일은 2일이다.', () => {
        // given
        const transactionAt = dayjs('2023-10-30');
        const defaultBusinessDay = 2;
        const substituteHolidayList: string[] = [];

        // when
        const businessDay = CardCommission.getCardBusinessDay({
          transactionAt,
          defaultBusinessDay,
          substituteHolidayList,
        });

        expect(businessDay).toBe(2);
      });

      it('매출 발생 날짜: 2023-10-30(월), 기본 정산일 2(영업일 O), 대체 공휴일(가정: 2023-11-01)이 하루가 있는 경우 최종 정산일은 3일이다.', () => {
        // given
        const transactionAt = dayjs('2023-10-30');
        const defaultBusinessDay = 2;
        const substituteHolidayList: string[] = ['2023-11-01'];

        // when
        const businessDay = CardCommission.getCardBusinessDay({
          transactionAt,
          defaultBusinessDay,
          substituteHolidayList,
        });

        expect(businessDay).toBe(3);
      });

      it('매출 발생 날짜: 2023-10-26(목), 기본 정산일 2(영업일 O), 휴일이 2일(토, 일) 겹칠 경우 최종 정산일은 4일이다.', () => {
        // given
        const transactionAt = dayjs('2023-10-26');
        const defaultBusinessDay = 2;
        const substituteHolidayList: string[] = [];

        // when
        const businessDay = CardCommission.getCardBusinessDay({
          transactionAt,
          defaultBusinessDay,
          substituteHolidayList,
        });

        expect(businessDay).toBe(4);
      });

      it('매출 발생 날짜: 2023-10-27(금), 기본 정산일 3(영업일 O), 휴일이 2일(토, 일) 겹치고 대체 공휴일(가정: 2023-11-01)이 겹칠 경우 최종 정산일은 6일이다.', () => {
        // given
        const transactionAt = dayjs('2023-10-27');
        const defaultBusinessDay = 3;
        const substituteHolidayList: string[] = ['2023-11-01'];

        // when
        const businessDay = CardCommission.getCardBusinessDay({
          transactionAt,
          defaultBusinessDay,
          substituteHolidayList,
        });

        expect(businessDay).toBe(6);
      });

      it('매출 발생 날짜: 2023-11-03(금), 기본 정산일 2(영업일 O), 휴일이 2일(토, 일) 겹치고 최종 정산일은 4일이다.', () => {
        // given
        const transactionAt = dayjs('2023-11-03');
        const defaultBusinessDay = 2;
        const substituteHolidayList: string[] = [];

        // when
        const businessDay = CardCommission.getCardBusinessDay({
          transactionAt,
          defaultBusinessDay,
          substituteHolidayList,
        });

        expect(businessDay).toBe(4);
      });
    });
  });
});
