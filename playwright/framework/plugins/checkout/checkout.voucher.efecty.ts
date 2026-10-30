import { Context, FrameworkPlugin } from '../interface';
import { PayuEfectyPage } from '@pages/voucher/payuEfectyPage';

export class PluginCheckoutVoucherEfecty extends FrameworkPlugin {
  pluginBaseName = 'checkout.voucher.efecty';

  efectyPage!: PayuEfectyPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.efectyPage = new PayuEfectyPage(context.page);
  }

  /** @description Reads the expiration date text from the Efecty voucher and returns it as an ISO string. */
  async $tf_getExpirationDateIso() {
    return await this.efectyPage.getExpirationDateIso();
  }
}
