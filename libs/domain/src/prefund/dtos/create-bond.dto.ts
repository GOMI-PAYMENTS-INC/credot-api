import { $Enums } from '.prisma/client';
import { ApprovalType, CardCompanyName, CardType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDate, IsIn } from 'class-validator';
import * as dayjs from 'dayjs';

export class CreateBondDto {
  @IsDate()
  @Transform(({ value }) => dayjs(value).toDate())
  transactionAt: Date;

  @IsIn(Object.values($Enums.CardCompanyName))
  @Transform(({ value }) => $Enums.CardCompanyName[value])
  cardCompanyName: CardCompanyName;

  approvalNumber: string;

  @IsIn(Object.values($Enums.CardType))
  @Transform(({ value }) => $Enums.CardType[value])
  cardType: CardType;

  @IsIn(Object.values($Enums.ApprovalType))
  @Transform(({ value }) => $Enums.ApprovalType[value])
  approvalType: ApprovalType;

  approvalAmount: number;

  commission: number;

  userId: number;
}
