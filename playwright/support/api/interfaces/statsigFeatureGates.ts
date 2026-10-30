export interface StatsigCondition {
  type: string;
  targetValue: string[];
  operator: string;
  field: string;
}

export interface StatsigRule {
  id: string;
  baseID: string;
  name: string;
  passPercentage: number;
  conditions: StatsigCondition[];
  environments: string[];
}

export interface StatsigRulesData {
  rules: StatsigRule[];
}

export interface StatsigPagination {
  itemsPerPage: number;
  pageNumber: number;
  totalItems: number;
  nextPage: string | null;
  previousPage: string | null;
  all: string;
}

export interface StatsigGateRulesResponse {
  message: string;
  data: StatsigRulesData[];
  pagination: StatsigPagination;
}