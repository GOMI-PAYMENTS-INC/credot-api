import { QUEUE_NAME } from '@app/utils/queue/queue.name';

import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { CardType } from '@prisma/client';
import { Queue } from 'bull';

export enum CardNumberQueueType {
  ADD_CARD_NUMBER = 'ADD_CARD_NUMBER',
}

@Injectable()
export class CardNumberQueueService {
  private readonly logger = new Logger(CardNumberQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAME.CARD_NUMBER) private cardNumberQueue: Queue,
  ) {}

  async addQueue(
    data: {
      cardNumbers: { cardNumber: string; type: CardType | null }[];
      type: CardNumberQueueType;
    },
    requestId: string,
  ): Promise<boolean> {
    try {
      await this.cardNumberQueue.add(data.type, {
        ...data,
        requestId,
      });
      this.logger.log('>>>>> 신규 카드 번호 Job 등록', requestId);
      return true;
    } catch (error) {
      this.logger.error('>>>>> 신규 카드 번호 Job 등록 실패', requestId);
      this.logger.error(error);
      return false;
    }
  }
}
