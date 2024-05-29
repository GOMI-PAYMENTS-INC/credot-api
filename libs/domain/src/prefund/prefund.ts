import { CardCommission } from '@app/domain/prefund/card-commission';
import { GomiCommission } from '@app/domain/prefund/gomi-commission';
import {
  BondType,
  BusinessDayStoreType,
  CardCommissionRateStoreType,
  CreateListByCardType,
  PrefundByCardsObjType,
  PrefundRecordType,
  ByBusinessDayStoreType,
} from '@app/domain/prefund/prefund.type';
import { isZeroServiceCommission } from '@app/utils';

import { PrefundByCard, PrefundStatus } from '@prisma/client';
import * as dayjs from 'dayjs';

export class Prefund {
  private readonly userId: number;
  private readonly prefundGroupAt: string;
  private readonly substituteHolidayList: string[];
  private readonly cardCommissionRateStore: CardCommissionRateStoreType;
  private readonly businessDayStore: BusinessDayStoreType;
  private readonly byBusinessDayStore: ByBusinessDayStoreType;

  constructor(
    userId: number,
    prefundGroupAt: string,
    substituteHolidayList: string[],
    cardCommissionRateStore: CardCommissionRateStoreType,
    businessDayStore: BusinessDayStoreType,
    byBusinessDayStore: ByBusinessDayStoreType,
  ) {
    this.userId = userId;
    this.prefundGroupAt = prefundGroupAt;
    this.substituteHolidayList = substituteHolidayList;
    this.cardCommissionRateStore = cardCommissionRateStore;
    this.businessDayStore = businessDayStore;
    this.byBusinessDayStore = byBusinessDayStore;
  }

  public generatePrefundDataGroupByCard(
    data: PrefundRecordType[],
  ): CreateListByCardType {
    return [...data].reduce((acc, item) => {
      const isSetoff = item.status === PrefundStatus.SETOFF;
      const salesPrice = isSetoff ? 0 : item.salesPrice;
      const cardCommission = isSetoff ? 0 : item.cardCommission;
      const serviceCommission = isSetoff ? 0 : item.serviceCommission;
      const setoff = isSetoff ? item.salesPrice + item.cardCommission : 0;
      const index = `${item.cardCompanyName}_${dayjs(item.transactionAt).format(
        'YYYY-MM-DD',
      )}`;

      if (!acc[index]) {
        return {
          ...acc,
          [index]: {
            prefundGroupAt: item.prefundGroupAt,
            userId: this.userId,
            salesGroupAt: dayjs(item.transactionAt).format('YYYY-MM-DD'),
            cardSettlementGroupAt: dayjs(item.transactionAt)
              .add(
                CardCommission.getCardBusinessDay({
                  transactionAt: dayjs(item.transactionAt),
                  substituteHolidayList: this.substituteHolidayList,
                  defaultBusinessDay:
                    this.businessDayStore[item.cardCompanyName],
                  byBusinessDay:
                    this.byBusinessDayStore[item.cardCompanyName] ?? true, // 만약 영업일 기준 정보가 없으면 무조건 영업일 기준으로 처리 됨.
                }),
                'day',
              )
              .format('YYYY-MM-DD'),
            status: PrefundStatus.READY,
            cardCompanyName: item.cardCompanyName,
            salesPrice,
            cardCommission,
            serviceCommission,
            setoff,
          },
        };
      }

      return {
        ...acc,
        [index]: {
          ...acc[index],
          salesPrice: acc[index].salesPrice + salesPrice,
          cardCommission: acc[index].cardCommission + cardCommission,
          serviceCommission: acc[index].serviceCommission + serviceCommission,
          setoff: acc[index].setoff + setoff,
        },
      };
    }, {} as CreateListByCardType);
  }

  public generatePrefundData(salesBonds: BondType[]): PrefundRecordType[] {
    return salesBonds
      .filter(
        (item) =>
          // 선정산을 해줄 수 있는 기간이 0일 경우 수수료가 존재하지 않기 때문에 제외한다.
          !isZeroServiceCommission(
            GomiCommission.getBusinessDay({
              transactionAt: dayjs(item.transactionAt),
              requestAt: dayjs(this.prefundGroupAt),
              substituteHolidayList: this.substituteHolidayList,
              defaultBusinessDay: this.businessDayStore[item.cardCompanyName],
              byBusinessDay:
                this.byBusinessDayStore[item.cardCompanyName] ?? true, // 만약 영업일 기준 정보가 없으면 무조건 영업일 기준으로 처리 됨.
            }),
          ),
      )
      .map((item) => {
        const salesPrice = item.approvalAmount;
        const cardCommission = CardCommission.calculateCardCommission({
          salesPrice,
          commission: item.commission,
          cardType: item.cardType,
          cardRate: this.cardCommissionRateStore[item.cardCompanyName],
        });
        const originalBusinessDay = this.businessDayStore[item.cardCompanyName];
        const { businessDay, serviceCommission } =
          GomiCommission.calculateGomiCommission({
            transactionAt: dayjs(item.transactionAt),
            requestAt: dayjs(this.prefundGroupAt),
            salesPrice,
            commission: cardCommission,
            defaultBusinessDay: originalBusinessDay,
            substituteHolidayList: this.substituteHolidayList,
            byBusinessDay:
              this.byBusinessDayStore[item.cardCompanyName] ?? true, // 만약 영업일 기준 정보가 없으면 무조건 영업일 기준으로 처리 됨.
          });

        return {
          prefundGroupAt: this.prefundGroupAt,
          salesPrice,
          businessDay,
          originalBusinessDay,
          cardCommission,
          serviceCommission,
          userId: this.userId,
          bondId: item.id,
          status: PrefundStatus.READY,
          approvalType: item.approvalType,
          approvalNumber: item.approvalNumber,
          transactionId: item.transactionId,
          cardCompanyName: item.cardCompanyName,
          transactionAt: item.transactionAt,
        };
      });
  }

  public generateSetoffData(setOff: BondType[]): PrefundRecordType[] {
    return setOff.map((item) => {
      const salesPrice = item.approvalAmount;
      const commission = CardCommission.calculateCardCommission({
        salesPrice,
        commission: item.commission,
        cardType: item.cardType,
        cardRate: this.cardCommissionRateStore[item.cardCompanyName],
      });
      const businessDay = 0;
      const serviceCommission = 0;
      const status = PrefundStatus.SETOFF;

      return {
        bondId: item.id,
        prefundGroupAt: this.prefundGroupAt,
        status,
        approvalType: item.approvalType,
        approvalNumber: item.approvalNumber,
        transactionId: item.transactionId,
        cardCompanyName: item.cardCompanyName,
        salesPrice,
        transactionAt: item.transactionAt,
        businessDay,
        cardCommission: commission,
        serviceCommission: serviceCommission,
        userId: this.userId,
      };
    });
  }

  addPrefundByCard(
    totalData: PrefundRecordType[],
    prefundByCards: PrefundByCard[],
  ): PrefundRecordType[] {
    const prefundByCardsObj: PrefundByCardsObjType = prefundByCards.reduce(
      (acc, item) => ({
        ...acc,
        [`${item.cardCompanyName}_${item.salesGroupAt}`]: item.id,
      }),
      {} as PrefundByCardsObjType,
    );

    return totalData.map((item) => ({
      ...item,
      prefundByCardId:
        prefundByCardsObj[
          `${item.cardCompanyName}_${dayjs(item.transactionAt).format(
            'YYYY-MM-DD',
          )}`
        ],
    }));
  }
}
