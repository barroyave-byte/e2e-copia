import * as aplazoEN from './selectors/explore/aplazo/en';
import * as aplazoES from './selectors/explore/aplazo/es';
import * as aplazoPT from './selectors/explore/aplazo/pt';
import * as checkoutEN from './selectors/checkout/en';
import * as checkoutES from './selectors/checkout/es';
import * as checkoutPT from './selectors/checkout/pt';
import * as deunanowEN from './selectors/deunanow/en';
import * as deunanowES from './selectors/deunanow/es';
import * as deunanowPT from './selectors/deunanow/pt';
import * as oxxoEN from './selectors/explore/oxxo/en';
import * as oxxoES from './selectors/explore/oxxo/es';
import * as oxxoPT from './selectors/explore/oxxo/pt';
import * as exploreEN from './selectors/explore/en';
import * as exploreES from './selectors/explore/es';
import * as explorePT from './selectors/explore/pt';
import * as daviplataEN from './selectors/explore/daviplata/en';
import * as daviplataES from './selectors/explore/daviplata/es';
import * as daviplataPT from './selectors/explore/daviplata/pt';
import * as clickToPayEN from './selectors/explore/click_to_pay/en';
import * as clickToPayES from './selectors/explore/click_to_pay/es';
import * as clickToPayPT from './selectors/explore/click_to_pay/pt';
import * as paymentLinkEN from './selectors/payment_link/en';
import * as paymentLinkES from './selectors/payment_link/es';
import * as paymentLinkPT from './selectors/payment_link/pt';
import * as payupseEN from './selectors/explore/payupse/en';
import * as payupseES from './selectors/explore/payupse/es';
import * as payupsePT from './selectors/explore/payupse/pt';
import * as nequiEN from './selectors/explore/nequi/en';
import * as nequiES from './selectors/explore/nequi/es';
import * as nequiPT from './selectors/explore/nequi/pt';
import * as klapEN from './selectors/explore/klap/en';
import * as klapES from './selectors/explore/klap/es';
import * as klapPT from './selectors/explore/klap/pt';
import * as nupayEN from './selectors/explore/nupay/en';
import * as nupayES from './selectors/explore/nupay/es';
import * as nupayPT from './selectors/explore/nupay/pt';
import * as vaultEN from './selectors/explore/vault/en';
import * as vaultES from './selectors/explore/vault/es';
import * as vaultPT from './selectors/explore/vault/pt';
import * as kueskiEN from './selectors/explore/kueski/en';
import * as kueskiES from './selectors/explore/kueski/es';
import * as kueskiPT from './selectors/explore/kueski/pt';
import * as adminEN from './selectors/admin/en';
import * as adminES from './selectors/admin/es';
import * as adminPT from './selectors/admin/pt';
import * as voucherEN from './selectors/voucher/en';
import * as voucherES from './selectors/voucher/es';
import * as voucherPT from './selectors/voucher/pt';
import * as mercadoPagoWalletES from './selectors/explore/mercadopago_wallet/es';
import * as mercadoPagoWalletPT from './selectors/explore/mercadopago_wallet/pt';
import * as mercadoPagoWalletEN from './selectors/explore/mercadopago_wallet/en';
import * as redirectToCommerceEN from './selectors/redirect_to_commerce/en';
import * as redirectToCommerceES from './selectors/redirect_to_commerce/es';
import * as redirectToCommercePT from './selectors/redirect_to_commerce/pt';
import * as addiES from './selectors/explore/addi/es';
import * as astropayES from './selectors/explore/astropay/es';
import * as astropayEN from './selectors/explore/astropay/en';
import * as astropayPT from './selectors/explore/astropay/pt';
import * as safetypayES from './selectors/safetypay/es';
import * as safetypayEN from './selectors/safetypay/en';
import * as safetypayPT from './selectors/safetypay/pt';
import * as splitPaymentES from './selectors/split_payments/es';
import * as splitPaymentEN from './selectors/split_payments/en';
import * as splitPaymentPT from './selectors/split_payments/pt';

const languageResources = {
  admin: { EN: adminEN, ES: adminES, PT: adminPT },
  checkout: { EN: checkoutEN, ES: checkoutES, PT: checkoutPT },
  deunanow: { EN: deunanowEN, ES: deunanowES, PT: deunanowPT },
  explore: { EN: exploreEN, ES: exploreES, PT: explorePT },
  daviplata: { EN: daviplataEN, ES: daviplataES, PT: daviplataPT },
  oxxo: { EN: oxxoEN, ES: oxxoES, PT: oxxoPT },
  aplazo: { EN: aplazoEN, ES: aplazoES, PT: aplazoPT },
  click_to_pay: { EN: clickToPayEN, ES: clickToPayES, PT: clickToPayPT },
  payment_link: { EN: paymentLinkEN, ES: paymentLinkES, PT: paymentLinkPT },
  payupse: { EN: payupseEN, ES: payupseES, PT: payupsePT },
  nequi: { EN: nequiEN, ES: nequiES, PT: nequiPT },
  klap: { EN: klapEN, ES: klapES, PT: klapPT },
  nupay: { EN: nupayEN, ES: nupayES, PT: nupayPT },
  vault: { EN: vaultEN, ES: vaultES, PT: vaultPT },
  kueski: { EN: kueskiEN, ES: kueskiES, PT: kueskiPT },
  voucher: { EN: voucherEN, ES: voucherES, PT: voucherPT },
  mercadopago_wallet: { EN: mercadoPagoWalletEN, ES: mercadoPagoWalletES, PT: mercadoPagoWalletPT },
  redirect_to_commerce: {
    EN: redirectToCommerceEN,
    ES: redirectToCommerceES,
    PT: redirectToCommercePT,
  },
  addi: { ES: addiES },
  astropay: { EN: astropayEN, ES: astropayES, PT: astropayPT },
  safetypay: { ES: safetypayES, EN: safetypayEN, PT: safetypayPT },
  split_payments: { ES: splitPaymentES, EN: splitPaymentEN, PT: splitPaymentPT },
};

export default languageResources;
