import { Context, FrameworkPlugin } from '../interface';
import { resolveMerchantId, resolveMerchantToken } from '../../resolve';
import {
  createCampaignMCI,
  createCampaignMSI,
  deleteCampaign,
} from '@support/newman/apiCallNewman';
import { CurrencyValues } from '@support/interfaces/currencyTypes';

export interface CampaignParams {
  currency: CurrencyValues;
  merchantId?: string;
  merchantToken?: string;
}

/**
 * Installment campaigns (MSI / MCI).
 *
 * `createCampaignMSI` (64 uses), `createCampaignMCI` (47) and the installment campaign
 * helpers (38) were the next block of setup specs still had to write by hand. `delete` is
 * here mainly to be used from `cleanup`, so a test stops leaving campaigns behind on the
 * merchant it provisioned.
 */
export class PluginSetupCampaign extends FrameworkPlugin {
  pluginBaseName = 'setup.campaign';

  setTestContext(context: Context) {
    super.setTestContext(context);
  }

  /** @description Creates an MSI (meses sin intereses) installment campaign for the merchant in the given currency. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  async $tf_createMSI({ currency, merchantId, merchantToken }: CampaignParams) {
    const action = 'setup.campaign.createMSI';
    return await createCampaignMSI(
      currency,
      resolveMerchantId(this.context, action, merchantId),
      resolveMerchantToken(this.context, action, merchantToken)
    );
  }

  /** @description Creates an MCI (meses con intereses) installment campaign for the merchant in the given currency. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  async $tf_createMCI({ currency, merchantId, merchantToken }: CampaignParams) {
    const action = 'setup.campaign.createMCI';
    return await createCampaignMCI(
      currency,
      resolveMerchantId(this.context, action, merchantId),
      resolveMerchantToken(this.context, action, merchantToken)
    );
  }

  /** @description Deletes an installment campaign; omit campaignId to delete the merchant's campaigns. Intended for the cleanup list so a test does not leave campaigns behind. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  async $tf_delete({
    campaignId,
    merchantId,
    merchantToken,
  }: {
    campaignId?: string;
    merchantId?: string;
    merchantToken?: string;
  } = {}) {
    const action = 'setup.campaign.delete';
    await deleteCampaign(
      resolveMerchantId(this.context, action, merchantId),
      resolveMerchantToken(this.context, action, merchantToken),
      campaignId
    );
  }
}
