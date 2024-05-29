import { EnumType } from '@app/utils/decorators';

import { CardCompanyName, CrawlingType, UserType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UpdateUserDataDto {
  @IsEnum(UserType)
  @EnumType(UserType, 'UserTypeEnum')
  @IsOptional()
  type?: UserType;

  @IsString()
  companyName?: string;

  @IsNumber()
  limitFutureFund?: number;

  @IsString()
  @IsOptional()
  businessNumber?: string;

  @IsString()
  @IsOptional()
  corporateRegistrationNumber?: string;

  @IsString()
  @IsOptional()
  industryType?: string;

  @IsString()
  @IsOptional()
  businessType?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  companyAddress?: string;

  @IsString()
  @IsOptional()
  managerPosition?: string;

  @IsString()
  @IsOptional()
  managerName?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccountHolder?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsEnum(CrawlingType)
  @EnumType(CrawlingType, 'CrawlingTypeEnum')
  @IsOptional()
  crawlingType?: CrawlingType;

  @IsString()
  @IsOptional()
  crawlingAccountId?: string;

  @IsString()
  @IsOptional()
  crawlingPassword?: string;

  @IsNumber()
  @IsOptional()
  businessLicenseFileId?: number;

  @IsString()
  @IsOptional()
  companyEmail?: string;

  @IsNumber()
  @IsOptional()
  corporateRegisterFileId?: number;

  @IsNumber()
  @IsOptional()
  certificateOfCorporateSealFileId?: number;

  @IsOptional()
  crawlingFranchiseInfos?: FranchiseInfo[];
}

interface FranchiseInfo {
  id?: number;
  cardCompanyName: CardCompanyName;
  franchiseNumber: string;
}

export class UpdateUserDto {
  @IsNumber()
  id: number;

  @ValidateNested()
  data: UpdateUserDataDto;
}
