import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ApplyDto {
  @Expose()
  createdAt: Date;

  @Expose()
  status: string;

  @Expose()
  companyName: string;

  @Expose()
  name: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  email: string;

  @Expose()
  id: number;

  @Expose()
  companyType: string;

  @Expose()
  industryType: string;

  @Expose()
  address: string;

  @Expose()
  monthlySales: string;

  @Expose()
  jobTitle: string;

  @Expose()
  interestedService: string;

  @Expose()
  marketingAgree: boolean;
}
