import { EnumType } from '@app/utils/decorators';

import { CardCompanyName, CrawlingType, UserType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @IsEnum(UserType)
  @EnumType(UserType, 'UserTypeEnum')
  @IsOptional()
  type?: UserType;

  @IsString()
  companyName: string;

  @IsString()
  @IsOptional()
  companyEmail?: string;

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
  companyAddress?: string;

  @IsString()
  @IsOptional()
  managerPosition?: string;

  @IsString()
  @IsOptional()
  managerName?: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  password: string;

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

  @IsNumber()
  @IsOptional()
  corporateRegisterFileId?: number;

  @IsNumber()
  @IsOptional()
  certificateOfCorporateSealFileId?: number;

  @IsOptional()
  crawlingFranchiseInfos: FranchiseInfo[];
}

interface FranchiseInfo {
  cardCompanyName: CardCompanyName;
  franchiseNumber: string;
}
