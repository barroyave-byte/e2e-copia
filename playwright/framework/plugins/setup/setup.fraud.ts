import { Context, FrameworkPlugin } from '../interface';
import { resolveMerchantId, resolveMerchantToken } from '../../resolve';
import { configDynamicRoutingWithFraud } from '@support/newman/apiCallNewman';
import {
  buildAllRisksFraudRoutingRule,
  FRAUD_MANUAL_REVIEW_PROCESSOR_BODIES,
  FraudManualReviewEngine,
} from '@support/http/testData/dynamicRouting/FraudRoutingConfig';
import { BaseProcessor } from '@support/interfaces/payment_processors/baseProcessor';

export interface ConfigureManualReviewEngineParams {
  /** Fraud engine to provision with manual review enabled, e.g. "CYBERSOURCE". */
  engine: FraudManualReviewEngine;
  /**
   * Processor every risk level routes to. Passing the same config used to create the
   * processor keeps the routing rule and the connection from drifting apart.
   */
  paymentProcessor: BaseProcessor;
  merchantId?: string;
  merchantToken?: string;
}

export class PluginSetupFraud extends FrameworkPlugin {
  pluginBaseName = 'setup.fraud';

  setTestContext(context: Context) {
    super.setTestContext(context);
  }

  /** @description Enables dynamic routing, provisions the given fraud engine with manual review turned on, and makes the default rule send every risk level to the given payment processor. This is what puts a transaction "in review" instead of resolving it to an immediate approve or decline. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  async $tf_configureManualReviewEngine({
    engine,
    paymentProcessor,
    merchantId,
    merchantToken,
  }: ConfigureManualReviewEngineParams) {
    const action = 'setup.fraud.configureManualReviewEngine';
    const { payment_processor_id: paymentProcessorId, name } = paymentProcessor;

    if (paymentProcessorId === undefined) {
      throw new Error(
        `${action}: the "${name}" processor config has no payment_processor_id, so the routing rule has nothing to point at.`
      );
    }

    await configDynamicRoutingWithFraud(
      FRAUD_MANUAL_REVIEW_PROCESSOR_BODIES[engine],
      buildAllRisksFraudRoutingRule(engine, paymentProcessorId),
      resolveMerchantId(this.context, action, merchantId),
      resolveMerchantToken(this.context, action, merchantToken)
    );
  }
}
