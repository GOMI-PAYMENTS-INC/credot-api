import { Expose, Type } from 'class-transformer';

@Expose()
export class HomeChartSeries {
  name: string;
  type: string;
  stack: string;
  data: number[];
}

Expose();
export class HomeChartDto {
  xAxis: string[];
  legend: string[];
  @Type(() => HomeChartSeries)
  series: HomeChartSeries[];
}
