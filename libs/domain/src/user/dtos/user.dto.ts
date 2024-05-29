import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsNumber } from 'class-validator';

@Exclude()
export class UserDto {
  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  name: string;

  @Expose()
  limitFutureFund: number;

  @Expose()
  phoneNumber: string;

  @Expose()
  createdAt: Date;

  @Expose()
  managerName: string;

  @Expose()
  companyEmail?: string;

  @Expose()
  managerPosition: string;

  @Expose()
  businessNumber: string;

  @Expose()
  corporateRegistrationNumber: string;

  @Expose()
  industryType: string;

  @Expose()
  businessType: string;

  @Expose()
  companyAddress: string;

  @Expose()
  bankName: string;

  @Expose()
  bankAccountHolder: string;

  @Expose()
  bankAccount: string;

  @Expose()
  businessLicenseFileId: number;

  @Expose()
  corporateRegisterFileId: number;

  @Expose()
  certificateOfCorporateSealFileId: number;

  @Expose()
  role: string;

  @Expose()
  @IsNumber()
  id: number;
}
