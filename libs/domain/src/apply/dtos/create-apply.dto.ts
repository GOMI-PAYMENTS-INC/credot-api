import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateApplyDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  email: string;

  @IsString()
  companyName: string;

  @IsString()
  name: string;

  @IsString()
  companyType: string;

  @IsString()
  industryType: string;

  @IsString()
  address: string;

  @IsString()
  @IsOptional()
  monthlySales: string;

  @IsString()
  jobTitle: string;

  @IsString()
  interestedService: string;

  @IsBoolean()
  marketingAgree: boolean;
}
