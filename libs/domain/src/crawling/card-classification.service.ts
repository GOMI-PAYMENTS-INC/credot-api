import { PrismaService } from '@app/utils/prisma';

import { Injectable } from '@nestjs/common';
import { CardType } from '@prisma/client';

@Injectable()
export class CardClassificationService {
  constructor(private readonly prismaService: PrismaService) {}

  async findCardClassification(): Promise<{ [key: string]: CardType }> {
    const cardClassification =
      await this.prismaService.cardClassification.findMany();
    return cardClassification.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.cardNumber]: cur.type,
      }),
      {},
    );
  }
}
