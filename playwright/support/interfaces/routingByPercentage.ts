import { ConnectionsAvailable } from './connectionsAvailable';
import { RiskLevel } from './routingConfig';

export type ShadowModeAuthorization = 'pre' | 'post';

interface RoutingByPercentageBaseRouteConfig {
  percentage: number;
  expectedPathName: string;
  expectedWeight: number;
}

export interface PaymentOnlyRouteConfig extends RoutingByPercentageBaseRouteConfig {
  kind: 'payment';
  paymentProcessor: ConnectionsAvailable;
}

export interface FraudToPaymentRouteConfig extends RoutingByPercentageBaseRouteConfig {
  kind: 'fraud_to_payment';
  fraudProcessor: ConnectionsAvailable;
  riskProcessors: Record<RiskLevel, ConnectionsAvailable>;
}

export interface FraudToPaymentToPaymentRouteConfig extends RoutingByPercentageBaseRouteConfig {
  kind: 'fraud_to_payment_to_payment';
  fraudProcessor: ConnectionsAvailable;
  riskProcessorChains: Record<RiskLevel, ConnectionsAvailable[]>;
}

export interface PaymentWithShadowRouteConfig extends RoutingByPercentageBaseRouteConfig {
  kind: 'payment_with_shadow';
  paymentProcessor: ConnectionsAvailable;
  shadowModeProcessor: ConnectionsAvailable;
  shadowModeAuthorization: ShadowModeAuthorization;
}

export interface PaymentWithPostAuthRouteConfig extends RoutingByPercentageBaseRouteConfig {
  kind: 'payment_with_post_auth';
  paymentProcessor: ConnectionsAvailable;
  postAuthorizationProcessor: ConnectionsAvailable;
}

export type RoutingByPercentageRouteConfig =
  | PaymentOnlyRouteConfig
  | FraudToPaymentRouteConfig
  | FraudToPaymentToPaymentRouteConfig
  | PaymentWithShadowRouteConfig
  | PaymentWithPostAuthRouteConfig;

export interface RoutingByPercentageScenario {
  ruleName: string;
  expectedProcessor: ConnectionsAvailable;
  expectedPathName: string;
  expectedWeight: number;
  expectedFraudProcessor?: ConnectionsAvailable;
  expectedShadowModeProcessor?: ConnectionsAvailable;
  routes: [RoutingByPercentageRouteConfig, RoutingByPercentageRouteConfig];
}
