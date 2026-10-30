import { Context, FrameworkPlugin } from '../interface';
import { resolveMerchantId, resolveMerchantToken } from '../../resolve';
import { assertHttpResponse } from '../../httpContract';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';
import { USE_DYNAMIC_ROUTING_ENABLED } from '@support/http/testData/payment/PaymentMerchantConfigurations';

export interface CascadeMember {
  /** Catalog id of the processor (BaseProcessor.payment_processor_id), e.g. 45 for CyberSource. */
  paymentProcessorId: number;
  /** The merchant's own connection, as returned by setup.processor.createProcessor. */
  merchantPaymentProcessorId: string;
}

export interface CreateCascadeRuleParams {
  /** Attempt order: the first member is tried first, the next ones only if it fails. */
  members: CascadeMember[];
  label?: string;
  merchantId?: string;
  merchantToken?: string;
}

export class PluginSetupRouting extends FrameworkPlugin {
  pluginBaseName = 'setup.routing';

  setTestContext(context: Context) {
    super.setTestContext(context);
  }

  /** @description Enables dynamic routing for the merchant and creates its default payment rule as a cascade over the given connections, in the given order: the next connection is attempted only when the previous one fails. Use it to put two affiliations of the same PSP behind one strategy. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  async $tf_createCascadeRule({
    members,
    label = 'cascade default rule',
    merchantId,
    merchantToken,
  }: CreateCascadeRuleParams) {
    const action = 'setup.routing.createCascadeRule';
    if (members.length < 2) {
      throw new Error(
        `${action}: a cascade needs at least 2 members, got ${members.length}. With one member there is nothing to cascade to.`
      );
    }

    const resolvedMerchantId = resolveMerchantId(this.context, action, merchantId);
    const resolvedMerchantToken = resolveMerchantToken(this.context, action, merchantToken);

    await ServiceFactory.getService(SERVICE_KEYS.PAYMENT).configurationMerchantPayments({
      merchantId: resolvedMerchantId,
      merchantToken: resolvedMerchantToken,
      storeId: 'all',
      configurationMerchantPaymentsData: USE_DYNAMIC_ROUTING_ENABLED,
    });

    const body = {
      label,
      priority: 1,
      status: 'enabled',
      is_default: true,
      trigger: 'merchant_rule',
      data_type: 'credit_card',
      ignore_next_rules: false,
      conditions: [],
      members: members.map((member, index) => ({
        payment_processor_id: member.paymentProcessorId,
        merchant_payment_processor_id: member.merchantPaymentProcessorId,
        sort: index + 1,
        capabilities: null,
        strategy: 'cascade',
      })),
    };

    const response = await ServiceFactory.getService(
      SERVICE_KEYS.PAYMENT_ROUTING
    ).createMerchantRule(resolvedMerchantId, resolvedMerchantToken, body);

    assertHttpResponse(
      { method: 'POST', operation: 'createCascadeRule', body },
      { status: response.status, body: response.data },
      { status: 200 }
    );
    return response.data;
  }
}
