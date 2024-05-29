import { PrismaService } from '@app/utils/prisma';
import { CardNumberQueueType, QUEUE_NAME } from '@app/utils/queue';

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { CardType } from '@prisma/client';

@Processor(QUEUE_NAME.CARD_NUMBER)
export class CardNumberConsumer {
  private readonly logger = new Logger(CardNumberConsumer.name);

  constructor(private readonly prismaService: PrismaService) {}

  @Process({
    name: CardNumberQueueType.ADD_CARD_NUMBER,
    concurrency: 1,
  })
  async addCardNumber(job) {
    const input: {
      cardNumbers: { cardNumber: string; type: CardType }[];
      requestId: string;
    } = job.data;
    const { cardNumbers, requestId } = input;

    this.logger.log(
      `새로운 카드 분류: ${cardNumbers
        .map((card) => card.cardNumber)
        .join(', ')} 수: ${cardNumbers.length}: ${requestId}`,
    );

    try {
      await this.prismaService.cardClassification.createMany({
        data: cardNumbers,
        skipDuplicates: true,
      });
    } catch (error) {
      this.logger.error(error);
      throw new RuntimeException(error);
    }
  }
}
