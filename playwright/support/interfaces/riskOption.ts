import { ConnectionsAvailable } from './connectionsAvailable';

export type Action = 'process' | 'decline';

export type RiskLevel = 'high' | 'medium' | 'low';

export type FraudDecision =
  | 'low_risk'
  | 'medium_risk'
  | 'high_risk'
  | 'pending_risk'
  | 'manual_review';

export type FraudProcessStatus = 'pending' | 'accepted' | 'rejected' | 'in_review';

interface OptionsProcessor {
  name: ConnectionsAvailable;
  validateCvv: boolean;
  require3ds: boolean;
  actionForProcessor: Action;
}

export interface RiskOption {
  riskLevel: RiskLevel;
  action: Action;
  processor?: OptionsProcessor;
}

export interface AnalysisResult {
  fraudDecision: FraudDecision;
}
