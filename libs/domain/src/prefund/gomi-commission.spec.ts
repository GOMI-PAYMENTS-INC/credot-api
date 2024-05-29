import { GomiCommission } from '@app/domain/prefund/gomi-commission';

import * as dayjs from 'dayjs';

describe('GomiCommission', () => {
  describe('calculateGomiCommission', () => {
    it('매출 발생 날짜: 2023-10-30(월), 선정산 요청 날짜: 2023-10-31(화), 기본 정산일 2, 매출액 30,000, 카드수수료 -300 일 경우 최종 정산일은 1일 그리고 고미 수수료는 -29 이다.', () => {
      // given
      const requestAt = dayjs('2023-10-31');
      const transactionAt = dayjs('2023-10-30');
      const defaultBusinessDay = 2;
      const substituteHolidayList: string[] = [];
      const salesPrice = 30000;
      const commission = -300;

      // when
      const gomiCommission = GomiCommission.calculateGomiCommission({
        transactionAt,
        requestAt,
        salesPrice,
        commission,
        defaultBusinessDay,
        substituteHolidayList,
      });

      expect(gomiCommission.businessDay).toBe(1);
      expect(gomiCommission.serviceCommission).toBe(-29);
    });
  });

  describe('getBusinessDay', () => {
    it('매출 발생 날짜: 2023-10-30(월), 선정산 요청 날짜: 2023-10-31(화), 기본 정산일 2, 대체휴일이 없을 경우 최종 정산일은 1일이다.', () => {
      // given
      const requestAt = dayjs('2023-10-31');
      const transactionAt = dayjs('2023-10-30');
      const defaultBusinessDay = 2;
      const substituteHolidayList: string[] = [];

      // when
      const businessDay = GomiCommission.getBusinessDay({
        transactionAt,
        requestAt,
        defaultBusinessDay,
        substituteHolidayList,
      });

      expect(businessDay).toBe(1);
    });

    it('매출 발생 날짜: 2023-10-30(월), 선정산 요청 날짜: 2023-10-31(화), 기본 정산일 2, 대체 공휴일(가정: 2023-11-01)이 하루가 있는 경우 최종 정산일은 2일이다.', () => {
      // given
      const transactionAt = dayjs('2023-10-30');
      const requestAt = dayjs('2023-10-31');
      const defaultBusinessDay = 2;
      const substituteHolidayList: string[] = ['2023-11-01'];

      // when
      const businessDay = GomiCommission.getBusinessDay({
        transactionAt,
        requestAt,
        defaultBusinessDay,
        substituteHolidayList,
      });

      expect(businessDay).toBe(2);
    });

    it('매출 발생 날짜: 2023-10-26(목), 선정산 요청 날짜: 2023-10-27(금), 기본 정산일 2, 휴일이 2일(토, 일) 겹칠 경우 최종 정산일은 3일이다.', () => {
      // given
      const transactionAt = dayjs('2023-10-26');
      const requestAt = dayjs('2023-10-27');
      const defaultBusinessDay = 2;
      const substituteHolidayList: string[] = [];

      // when
      const businessDay = GomiCommission.getBusinessDay({
        transactionAt,
        requestAt,
        defaultBusinessDay,
        substituteHolidayList,
      });

      expect(businessDay).toBe(3);
    });

    it('매출 발생 날짜: 2023-10-27(금), 선정산 요청 날짜: 2023-10-28(토), 기본 정산일 3, 휴일이 2일(토, 일) 겹치고 대체 공휴일(가정: 2023-11-01)이 겹칠 경우 최종 정산일은 5일이다.', () => {
      // given
      const transactionAt = dayjs('2023-10-27');
      const requestAt = dayjs('2023-10-28');
      const defaultBusinessDay = 3;
      const substituteHolidayList: string[] = ['2023-11-01'];

      // when
      const businessDay = GomiCommission.getBusinessDay({
        transactionAt,
        requestAt,
        defaultBusinessDay,
        substituteHolidayList,
      });

      expect(businessDay).toBe(5);
    });

    it('매출 발생 날짜: 2023-11-03(금), 선정산 요청 날짜: 2023-11-06(월), 기본 정산일 2, 휴일이 2일(토, 일) 겹치고 최종 정산일은 1일이다.', () => {
      // given
      const transactionAt = dayjs('2023-11-03');
      const requestAt = dayjs('2023-11-06');
      const defaultBusinessDay = 2;
      const substituteHolidayList: string[] = [];

      // when
      const businessDay = GomiCommission.getBusinessDay({
        transactionAt,
        requestAt,
        defaultBusinessDay,
        substituteHolidayList,
      });

      expect(businessDay).toBe(1);
    });
  });
});
