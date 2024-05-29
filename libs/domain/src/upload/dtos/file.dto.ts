import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class FileDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  key: string;

  @Expose()
  url: string;
}
