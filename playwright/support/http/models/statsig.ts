import { StatsigCondition } from '@support/api/interfaces/statsigFeatureGates';

export interface StatsigCreateGateRuleBody {
  name: string;
  passPercentage: number;
  conditions: StatsigCondition[];
  environments: string[];
  id?: string;
  baseID?: string;
  returnValue: Record<string, any>;
}

export interface StatsigUpdateGateRuleBody {
  id: string;
  name?: string;
  baseID?: string;
  passPercentage?: number;
  conditions?: StatsigCondition[];
  environments?: string[];
  returnValue?: Record<string, any>;
}

export interface StatsigGetGateRulesResponse {
  message: string;
  data: Array<{ rules: any[] }>;
}
