import { generateTransactionId } from '@app/domain/crawling/crawling.helper';
import { BondType, CreateBondDto } from '@app/domain/prefund';
import { BondDto } from '@app/domain/prefund/dtos/bond.dto';
import { PrismaService } from '@app/utils/prisma';

import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import * as dayjs from 'dayjs';

@Injectable()
export class BondService {
  constructor(private readonly prisma: PrismaService) {}
  async getBondList(
    { endDate, userId }: { endDate: dayjs.Dayjs; userId: number },
    {
      tx,
    }: {
      tx?: Omit<
        PrismaClient,
        | '$connect'
        | '$disconnect'
        | '$on'
        | '$transaction'
        | '$use'
        | '$extends'
      >;
    },
  ): Promise<BondType[]> {
    return (tx || this.prisma).$queryRaw(Prisma.sql`
          SELECT 
            Bond.id,
            Bond.transactionAt,
            Bond.affiliateStoreNumber,
            Bond.cardCompanyName,
            Bond.cardType,
            Bond.approvalType,
            Bond.approvalNumber,
            Bond.approvalAmount,
            Bond.claimingResult,
            Bond.claimingAt,
            Bond.installmentPeriod,
            Bond.vat,
            Bond.commission,
            Bond.depositAt,
            Bond.depositAmount,
            Bond.terminalNumber,
            Bond.terminalName,
            Bond.vanType,
            Bond.userId,
            Bond.transactionId
          FROM Bond
          INNER JOIN (
              # 매출 정보 승인 번호 (승인, 취소)의 합이 0 이상일 경우 선정산 대상이라고 판단
              SELECT approvalNumber, userId, max(transactionAt) as transactionAt
              FROM Bond
              WHERE transactionId NOT IN (SELECT transactionId FROM Prefund WHERE Prefund.userId = ${userId})
                AND Bond.transactionAt <= ${endDate.toDate()}
                AND Bond.userId = ${userId}
              GROUP BY approvalNumber, userId
              HAVING sum(approvalAmount) > 0
          ) max_bond_records ON max_bond_records.approvalNumber = Bond.approvalNumber 
                             AND max_bond_records.transactionAt = Bond.transactionAt
                             AND max_bond_records.userId = Bond.userId
        `);
  }

  async getSetoffBondList(
    { endDate, userId }: { endDate: dayjs.Dayjs; userId: number },
    {
      tx,
    }: {
      tx?: Omit<
        PrismaClient,
        | '$connect'
        | '$disconnect'
        | '$on'
        | '$transaction'
        | '$use'
        | '$extends'
      >;
    },
  ): Promise<BondType[]> {
    return (tx || this.prisma).$queryRaw(Prisma.sql`
          SELECT 
            Bond.id,
            Bond.transactionAt,
            Bond.affiliateStoreNumber,
            Bond.cardCompanyName,
            Bond.cardType,
            Bond.approvalType,
            Bond.approvalNumber,
            Bond.approvalAmount,
            Bond.claimingResult,
            Bond.claimingAt,
            Bond.installmentPeriod,
            Bond.vat,
            Bond.commission,
            Bond.depositAt,
            Bond.depositAmount,
            Bond.terminalNumber,
            Bond.terminalName,
            Bond.vanType,
            Bond.userId,
            Bond.transactionId
          FROM Bond
          INNER JOIN (
              # 매출 정보 승인 번호 (승인, 취소)의 합이 - 이상일 경우 취소 대상이라고 판단
              SELECT approvalNumber, userId, max(transactionAt) as transactionAt
              FROM Bond
              WHERE transactionId NOT IN (SELECT transactionId FROM Prefund WHERE Prefund.userId = ${userId})
                AND Bond.transactionAt <= ${endDate.toDate()}
                AND Bond.userId = ${userId}
              GROUP BY approvalNumber, userId
              HAVING sum(approvalAmount) < 0
          ) max_bond_records ON max_bond_records.approvalNumber = Bond.approvalNumber 
                             AND max_bond_records.transactionAt = Bond.transactionAt
                             AND max_bond_records.userId = Bond.userId
          WHERE
            # 선정산 완료 & 상계 안된 것 중
            Bond.approvalNumber IN (
              SELECT Prefund.approvalNumber
              FROM Prefund
              INNER JOIN PrefundByCard PBC on Prefund.prefundByCardId = PBC.id
              WHERE Prefund.userId = ${userId}
                AND PBC.status IN ('DEPOSIT_DONE', 'DONE')
            )
            AND Bond.approvalNumber NOT IN (
              SELECT Prefund.approvalNumber
              FROM Prefund
              INNER JOIN PrefundByCard PBC on Prefund.prefundByCardId = PBC.id
              WHERE Prefund.userId = ${userId}
                AND PBC.status IN ('SETOFF')
            )
        `);
  }

  async create({ userId, ...leftover }: CreateBondDto): Promise<BondDto> {
    try {
      const createBond = await this.prisma.bond.create({
        data: {
          ...leftover,
          transactionId: generateTransactionId({
            transactionAtDate: dayjs(leftover.transactionAt).format(
              'YYYY-MM-DD',
            ),
            approvalNumber: leftover.approvalNumber,
            approvalType: leftover.approvalType,
            approvalAmount: leftover.approvalAmount,
          }),
          User: {
            connect: {
              id: userId,
            },
          },
        },
      });
      return plainToInstance(BondDto, createBond);
    } catch (error) {
      throw new Error(error);
    }
  }
}
