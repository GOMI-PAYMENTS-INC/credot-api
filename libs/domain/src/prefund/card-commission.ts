import { CalculateCardCommissionType } from '@app/domain/prefund';

import { CardType } from '@prisma/client';
import * as dayjs from 'dayjs';

export class CardCommission {
  /***
   항상 음수로 리턴한다.
   commission: 음수로 입력 해야함
   ***/
  static calculateCardCommission({
    salesPrice,
    commission,
    cardType,
    cardRate,
  }: CalculateCardCommissionType): number {
    // 수수료가 이미 처리되었을 경우 그대로 활용
    if (commission !== 0) {
      return commission;
    }

    const checkRate = cardRate?.check || 0;
    const creditRate = cardRate?.credit || 0;

    return cardType === CardType.CHECK
      ? Math.floor(salesPrice * checkRate) * -1
      : Math.floor(salesPrice * creditRate) * -1;
  }

  /***
   카드 수수료 정산일 추출
   substituteHolidayList: YYYY-MM-DD list
   ***/
  static getCardBusinessDay({
    transactionAt,
    defaultBusinessDay,
    substituteHolidayList,
    byBusinessDay = true,
  }: {
    transactionAt: dayjs.Dayjs;
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

    return businessDay;
  }
}
