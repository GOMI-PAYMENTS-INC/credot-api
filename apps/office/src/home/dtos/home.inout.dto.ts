import { Expose } from 'class-transformer';

@Expose()
export class HomeInoutDto {
  prefundPrice: number;
  futureFundPrice: number;
}

@Expose()
export class HomeInoutInDto {
  date: string;
  returnPrice: number;
}
