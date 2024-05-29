import * as dayjs from 'dayjs';

export class GomiCommission {
  /***
   항상 음수로 리턴한다.
   commission: 음수로 입력 해야함
   ***/
  static calculateGomiCommission({
    transactionAt,
    requestAt,
    salesPrice,
    commission,
    defaultBusinessDay,
    substituteHolidayList = [],
    byBusinessDay = true,
  }: {
    transactionAt: dayjs.Dayjs;
    requestAt: dayjs.Dayjs;
    salesPrice: number;
    commission: number;
    defaultBusinessDay: number; // 정산일
    substituteHolidayList: string[];
    byBusinessDay?: boolean;
  }): { businessDay: number; serviceCommission: number } {
    const prefundBusinessDay = GomiCommission.getBusinessDay({
      transactionAt,
      requestAt,
      defaultBusinessDay: defaultBusinessDay,
      substituteHolidayList,
      byBusinessDay,
    });

    // 고미 수수료 * 카드사별 정산일
    const GOMI_COMMISSION_RATE = 0.001;
    const gomiCommissionRate = GOMI_COMMISSION_RATE * prefundBusinessDay;
    return {
      businessDay: prefundBusinessDay,
      serviceCommission:
        Math.floor((salesPrice + commission) * gomiCommissionRate) * -1,
    };
  }

  /***
   고미 수수료 정산일 추출
   substituteHolidayList: YYYY-MM-DD list
   ***/
  static getBusinessDay({
    transactionAt,
    requestAt,
    defaultBusinessDay,
    substituteHolidayList,
    byBusinessDay = true,
  }: {
    transactionAt: dayjs.Dayjs;
    requestAt: dayjs.Dayjs;
    defaultBusinessDay: number;
    substituteHolidayList: string[];
    byBusinessDay?: boolean;
  }) {
    let leftBusinessDay = defaultBusinessDay;
    let businessDay = 0;

    while (leftBusinessDay) {
      businessDay += 1;
      const nextDate = transactionAt.add(businessDay, 'day');
      const isWeekend = ['Saturday', 'Sunday'].includes(
        nextDate.format('dddd'),
      );
      const isSubstituteDay = substituteHolidayList.includes(
        nextDate?.format('YYYY-MM-DD'),
      );

      if (isWeekend || isSubstituteDay) {
        // 영업일 기준이 아니면 주말일 경우에도 leftBusinessDay 를 카운트하되 마지막 1일을 남기고 다음 평일이 올 때까지 반복된다.
        if (!byBusinessDay && leftBusinessDay > 1) {
          leftBusinessDay -= 1;
        }
        continue;
      }

      leftBusinessDay -= 1;
    }

    const fundDate = dayjs(transactionAt)
      .add(businessDay, 'day')
      .hour(23)
      .minute(59)
      .second(59);
    let finalBusinessDay = 0;
    let startAt = dayjs(requestAt);

    while (startAt.isBefore(fundDate, 'day')) {
      finalBusinessDay += 1;
      startAt = startAt.add(1, 'day');
    }

    return finalBusinessDay;
  }
}
