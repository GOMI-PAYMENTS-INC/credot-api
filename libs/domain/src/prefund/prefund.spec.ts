import { Prefund } from '@app/domain/prefund/prefund';
import {
  BondType,
  BusinessDayStoreType,
  ByBusinessDayStoreType,
  CardCommissionRateStoreType,
} from '@app/domain/prefund/prefund.type';

const mockCardCommissionRateStore: CardCommissionRateStoreType = {
  BC_CARD: { check: 0, credit: 0 },
  CREDIT_CARD: { check: 0, credit: 0 },
  HANA_CARD: { check: 0, credit: 0 },
  HDO_CARD: { check: 0, credit: 0 },
  HYUNDAE_CARD: { check: 0, credit: 0 },
  KB_CARD: { check: 0, credit: 0 },
  LOTTE_CARD: { check: 0, credit: 0 },
  NH_CARD: { check: 0, credit: 0 },
  SAMSUNG_CARD: { check: 0, credit: 0 },
  SHINHAN_CARD: { check: 0, credit: 0 },
  WOORI_CARD: { check: 0, credit: 0 },
};

const mockBusinessDayStore: BusinessDayStoreType = {
  BC_CARD: 3,
  CREDIT_CARD: 3,
  HANA_CARD: 2,
  HDO_CARD: 3,
  HYUNDAE_CARD: 2,
  KB_CARD: 3,
  LOTTE_CARD: 2,
  NH_CARD: 3,
  SAMSUNG_CARD: 2,
  SHINHAN_CARD: 3,
  WOORI_CARD: 2,
};

const mockByBusinessDayStore: ByBusinessDayStoreType = {
  BC_CARD: true,
  CREDIT_CARD: true,
  HANA_CARD: true,
  HDO_CARD: true,
  HYUNDAE_CARD: true,
  KB_CARD: true,
  LOTTE_CARD: true,
  NH_CARD: true,
  SAMSUNG_CARD: true,
  SHINHAN_CARD: true,
  WOORI_CARD: true,
};

const bondForPrefund: BondType = {
  id: 273425,
  transactionAt: new Date('2023-12-08T11:23:13.000Z'),
  affiliateStoreNumber: null,
  cardCompanyName: 'SHINHAN_CARD',
  cardType: 'CHECK',
  approvalType: 'APPROVED',
  approvalNumber: '02634503',
  approvalAmount: 30000,
  claimingResult: null,
  claimingAt: null,
  installmentPeriod: '일시불',
  vat: 0,
  commission: -390,
  depositAt: null,
  depositAmount: 0,
  terminalNumber: null,
  terminalName: null,
  vanType: 'KICC',
  userId: 168,
  transactionId: '2023-12-08-APPROVED-02634503-30000',
};

const bondForSetoff: BondType = {
  id: 273425,
  transactionAt: new Date('2023-12-08T11:23:13.000Z'),
  affiliateStoreNumber: null,
  cardCompanyName: 'SHINHAN_CARD',
  cardType: 'CHECK',
  approvalType: 'CANCEL',
  approvalNumber: '02634503',
  approvalAmount: -30000,
  claimingResult: null,
  claimingAt: null,
  installmentPeriod: '일시불',
  vat: 0,
  commission: 390,
  depositAt: null,
  depositAmount: 0,
  terminalNumber: null,
  terminalName: null,
  vanType: 'KICC',
  userId: 168,
  transactionId: '2023-12-08-CANCEL-02634503-30000',
};

describe('Prefund', () => {
  let prefund: Prefund;

  beforeEach(() => {
    // given
    const prefundGroupAt = '2023-12-09';
    const userId = 2;
    prefund = new Prefund(
      userId,
      prefundGroupAt,
      [],
      {
        ...mockCardCommissionRateStore,
        SHINHAN_CARD: { check: 0.013, credit: 0.016 },
      },
      {
        ...mockBusinessDayStore,
        SHINHAN_CARD: 3,
      },
      mockByBusinessDayStore,
    );
  });

  describe('generatePrefundData', () => {
    it('2023-12-08일에 발생한 매출에 대한 2023-12-09의 데일리 선정산 결과 선정산 데이터가 존재한다.', async () => {
      // given
      const data: BondType[] = [bondForPrefund];

      // when
      const result = prefund.generatePrefundData(data);

      expect(result).toEqual([
        {
          approvalNumber: '02634503',
          approvalType: 'APPROVED',
          bondId: 273425,
          businessDay: 4,
          cardCommission: -390,
          cardCompanyName: 'SHINHAN_CARD',
          originalBusinessDay: 3,
          prefundGroupAt: '2023-12-09',
          salesPrice: 30000,
          serviceCommission: -118,
          status: 'READY',
          transactionAt: new Date('2023-12-08T11:23:13.000Z'),
          transactionId: '2023-12-08-APPROVED-02634503-30000',
          userId: 2,
        },
      ]);
    });

    it('2023-12-05일에 발생한 매출에 대한 2023-12-09의 데일리 선정산 결과 선정산 데이터가 필터되어 없다.', async () => {
      // given
      const data: BondType[] = [
        {
          ...bondForPrefund,
          transactionAt: new Date('2023-12-05T11:23:13.000Z'),
        },
      ];

      // when
      const result = prefund.generatePrefundData(data);

      expect(result).toEqual([]);
    });
  });

  describe('generateSetoffData', () => {
    it('2023-12-08일에 발생한 매출 취소에 대한 2023-12-09의 데일리 선정산 결과 상계 데이터가 존재한다.', async () => {
      // given
      const data: BondType[] = [bondForSetoff];

      // when
      const result = prefund.generateSetoffData(data);

      expect(result).toEqual([
        {
          approvalNumber: '02634503',
          approvalType: 'CANCEL',
          bondId: 273425,
          businessDay: 0,
          cardCommission: 390,
          cardCompanyName: 'SHINHAN_CARD',
          prefundGroupAt: '2023-12-09',
          salesPrice: -30000,
          serviceCommission: 0,
          status: 'SETOFF',
          transactionAt: new Date('2023-12-08T11:23:13.000Z'),
          transactionId: '2023-12-08-CANCEL-02634503-30000',
          userId: 2,
        },
      ]);
    });

    it('2023-12-08일에 발생한 매출 취소 건에 카드 수수료가 0원으로 처리되더라도 2023-12-09의 데일리 선정산 결과 상계 데이터에 수수료가 적용된다.', async () => {
      // given
      const data: BondType[] = [
        {
          ...bondForSetoff,
          commission: 0,
        },
      ];

      // when
      const result = prefund.generateSetoffData(data);
      expect(result).toEqual([
        {
          approvalNumber: '02634503',
          approvalType: 'CANCEL',
          bondId: 273425,
          businessDay: 0,
          cardCommission: 390,
          cardCompanyName: 'SHINHAN_CARD',
          prefundGroupAt: '2023-12-09',
          salesPrice: -30000,
          serviceCommission: 0,
          status: 'SETOFF',
          transactionAt: new Date('2023-12-08T11:23:13.000Z'),
          transactionId: '2023-12-08-CANCEL-02634503-30000',
          userId: 2,
        },
      ]);
    });
  });

  describe('generatePrefundDataGroupByCard', () => {
    it('2023-12-08일에 발생한 매출에 대한 2023-12-09의 데일리 카드별 선정산 결과 존재한다.', async () => {
      // given
      const prefundData = prefund.generatePrefundData([bondForPrefund]);
      const setoffData = prefund.generateSetoffData([bondForSetoff]);

      // when
      const result = prefund.generatePrefundDataGroupByCard([
        ...prefundData,
        ...setoffData,
      ]);

      expect(result).toEqual({
        'SHINHAN_CARD_2023-12-08': {
          cardCommission: -390,
          cardCompanyName: 'SHINHAN_CARD',
          cardSettlementGroupAt: '2023-12-13',
          prefundGroupAt: '2023-12-09',
          salesGroupAt: '2023-12-08',
          salesPrice: 30000,
          serviceCommission: -118,
          setoff: -29610,
          status: 'READY',
          userId: 2,
        },
      });
    });
  });
});
