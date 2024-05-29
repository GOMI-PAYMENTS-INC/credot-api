export class SearchPrefundDto {
  dates: string[];
  data: SearchPrefundItem[];
}

export class SearchPrefundItem {
  name: string;
  values: number[];
}
