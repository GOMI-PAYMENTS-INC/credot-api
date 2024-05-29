import { CreateBondDto } from '@app/domain/prefund';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('CreateBondDto', () => {
  let input: any;

  beforeEach(() => {
    input = {
      transactionAt: '2023-12-18 23:59:59',
      cardCompanyName: 'SHINHAN_CARD',
      approvalAmount: 30_000,
      approvalType: 'APPROVED',
      userId: 1,
      cardType: 'CREDIT',
      commission: 0,
    };
  });

  describe('transactionAt', () => {
    it('문자열 날짜(YYYY-MM-DD HH:mm:ss)가 아닐 경우 실패한다.', async () => {
      // given
      input.transactionAt = 'invalid_date';
      const instance = plainToInstance(CreateBondDto, input);

      // when
      const result = await validate(instance);

      // then
      expect(result[0]).toBeDefined();
      expect(result[0].constraints).toEqual({
        isDate: 'transactionAt must be a Date instance',
      });
    });

    it('문자열 날짜(YYYY-MM-DD)일 경우 성공한다.', async () => {
      // given
      input.transactionAt = '2023-11-10';
      const instance = plainToInstance(CreateBondDto, input);

      // when
      const result = await validate(instance);

      // then
      expect(result[0]).toBeUndefined();
    });

    it('문자열 날짜(YYYY-MM-DD HH:mm:ss)일 경우 성공한다.', async () => {
      // given
      input.transactionAt = '2023-11-10 23:59:30';
      const instance = plainToInstance(CreateBondDto, input);

      // when
      const result = await validate(instance);

      // then
      expect(result[0]).toBeUndefined();
    });
  });

  describe('cardCompanyName', () => {
    it('유효하지 않은 카드명이 있을 경우 실패한다. ', async () => {
      // given
      input.cardCompanyName = 'INVALID_CARD_COMPANY_NAME';
      const instance = plainToInstance(CreateBondDto, input);

      // when
      const result = await validate(instance);

      // then
      expect(result[0]).toBeDefined();
      expect(result[0].constraints).toEqual({
        isIn: 'cardCompanyName must be one of the following values: BC_CARD, KB_CARD, HANA_CARD, HYUNDAE_CARD, SHINHAN_CARD, SAMSUNG_CARD, NH_CARD, LOTTE_CARD, HDO_CARD, CREDIT_CARD, WOORI_CARD',
      });
    });

    it('유효한 카드명이 있을 경우 성공한다. ', async () => {
      // given
      input.cardCompanyName = 'BC_CARD';
      const instance = plainToInstance(CreateBondDto, input);

      // when
      const result = await validate(instance);

      // then
      expect(result[0]).toBeUndefined();
    });
  });

  describe('cardType', () => {
    it('유효하지 않은 카드 타입이 있을 경우 실패한다. ', async () => {
      // given
      input.cardType = 'INVALID_CARD_TYPE';
      const instance = plainToInstance(CreateBondDto, input);

      // when
      const result = await validate(instance);

      // then
      expect(result[0]).toBeDefined();
      expect(result[0].constraints).toEqual({
        isIn: 'cardType must be one of the following values: CREDIT, CHECK',
      });
    });

    it('유효한 카드 타입이 있을 경우 성공한다. ', async () => {
      // given
      input.cardType = 'CREDIT';
      const instance = plainToInstance(CreateBondDto, input);

      // when
      const result = await validate(instance);

      // then
      expect(result[0]).toBeUndefined();
    });
  });

  describe('approvalType', () => {
    it('유효하지 않은 승인 타입은 실패한다.', async () => {
      // given
      input.approvalType = 'INVALID_TYPE';
      const instance = plainToInstance(CreateBondDto, input);

      // when
      const result = await validate(instance);

      // then
      expect(result[0].constraints).toEqual({
        isIn: 'approvalType must be one of the following values: APPROVED, CANCEL',
      });
    });

    it('유효한 승인 타입은 성공한다.', async () => {
      // given
      input.approvalType = 'APPROVED';
      const instance = plainToInstance(CreateBondDto, input);

      // when
      const result = await validate(instance);

      // then
      expect(result[0]).toBeUndefined();
    });
  });
});
