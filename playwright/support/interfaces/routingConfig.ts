import { ConnectionsAvailable } from './connectionsAvailable';

export type PaymentAction = 'process' | 'decline' | 'fraud';
export type RiskLevel = 'high' | 'medium' | 'low';

/**
 * Configuration for payment processors.
 */
export interface PaymentRoutingConfig {
  processor: ConnectionsAvailable; // e.g.: "Kushki", "Stripe", etc.
  validateCvv: boolean;
  require3ds: boolean;
  /**
   * Cascade: allows you to derive to another payment, or to fraud, or to terminate the flow.
   */
  cascade?: PaymentCascade;
}

/**
 * Discriminated unions for cascade in the payment flow.
 */
export type PaymentCascade =
  | { cascadeTo: 'decline' }
  | { cascadeTo: 'process'; next: PaymentRoutingConfig }
  | { cascadeTo: 'fraud'; next: FraudRoutingConfig };

/**
 * Configuration for fraud processors.
 * **Restriction:** There can only be ONE fraud configuration per RoutingConfig object.
 */
export interface FraudRoutingConfig {
  processor: ConnectionsAvailable; // e.g.: "Riskified"
  /**
   * Risk options define the action to take for each level.
   * If the action is 'process', it is expected to be escalated to a payment processor.
   */
  riskOptions: RiskRoutingOption[];
}

/**
 * Base for risk options.
 */
export interface RiskRoutingOptionBase {
  riskLevel: RiskLevel;
}

/**
 * Risk option that allows escalation ('process' action) to a payment processor.
 */
export interface RiskRoutingOptionProcess extends RiskRoutingOptionBase {
  action: 'process';
  next: PaymentRoutingConfig;
}

/**
 * Terminal risk option (decline action).
 */
export interface RiskRoutingOptionDecline extends RiskRoutingOptionBase {
  action: 'decline';
}

/**
 * Union discriminated against for fraud risk options.
 */
export type RiskRoutingOption = RiskRoutingOptionProcess | RiskRoutingOptionDecline;

/**
 * The root configuration allows you to define EITHER the payment or fraud configuration.
 */
export type RoutingConfig =
  | { paymentProcessorConfig: PaymentRoutingConfig; fraudProcessorConfig?: never }
  | { fraudProcessorConfig: FraudRoutingConfig; paymentProcessorConfig?: never };
