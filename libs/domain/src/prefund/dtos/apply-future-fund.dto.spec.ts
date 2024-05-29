import { ApplyFutureFundDto } from '@app/domain/prefund';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('ApplyFutureFundDto', () => {
  let input: any;
  beforeEach(() => {
    input = {
      date: '2023-10-12',
      userId: 1,
      price: 30000,
    };
  });

  describe('targetDate', () => {
    it('유효하지 않은 날짜 형식(YYYY-MM-DD)일 경우 실패한다. - 1', async () => {
      // given
      input.date = 'INVALID_DATE';
      const instance = plainToInstance(ApplyFutureFundDto, input);

      // when
      const result = await validate(instance);

      // then
      expect(result[0]).toBeDefined();
      expect(result[0].constraints).toEqual({
        matches: 'date must match /^\\d{4}-\\d{2}-\\d{2}$/ regular expression',
      });
    });

    it('유효하지 않은 날짜 형식(YYYY-MM-DD)일 경우 실패한다. - 2', async () => {
      // given
      input.date = '2023-12-18123123123123';
      const instance = plainToInstance(ApplyFutureFundDto, input);

      // when
      const result = await validate(instance);

      // then
      expect(result[0]).toBeDefined();
      expect(result[0].constraints).toEqual({
        matches: 'date must match /^\\d{4}-\\d{2}-\\d{2}$/ regular expression',
      });
    });

    it('유효한 날짜(YYYY-MM-DD)일 경우 성공한다..', async () => {
      // given
      input.date = '2023-12-28';
      const instance = plainToInstance(ApplyFutureFundDto, input);

      // when
      const result = await validate(instance);

      // then
      expect(result[0]).toBeUndefined();
    });
  });
});
