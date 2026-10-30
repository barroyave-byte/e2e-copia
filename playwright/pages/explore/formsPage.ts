import { CommonsActions } from '@pages/commonActions';
import { Locator, Page } from '@playwright/test';

const processors = {
  daviplata: {
    elementId: 'payment_method_daviplata',
  },
  nequi: {
    push: {
      elementId: 'payment_method_nequi_push',
    },
  },
  klap: {
    sodexo: {
      elementId: 'payment_method_klap_sodexo',
    },
    edenred: {
      elementId: 'payment_method_klap_edenred',
    },
  },
  astropay: {
    elementId: 'payment_method_astropay',
  },
  mercadoPagoWallet: {
    elementId: 'payment_method_mercadopago_wallet',
  },
  volarisReference: {
    elementId: 'payment_method_reference',
  },
  speiOpm: {
    elementId: 'payment_method_spei_opm',
  },
  safetypay: {
    elementId: 'payment_method_safetypay',
  },
};

export class FormsPage extends CommonsActions {
  page: Page;

  divDaviplata: Locator;
  divNequiPush: Locator;
  divKlapSodexo: Locator;
  divKlapEdenred: Locator;
  divMercadoPagoWallet: Locator;
  divReference: Locator;
  divSpeiOpm: Locator;
  divSafetypay: Locator;
  divAstropay: Locator;
  buttonEmbedPayment: Locator;
  buttonPay: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;

    this.divDaviplata = page.locator(`#${processors.daviplata.elementId}`);
    this.divNequiPush = page.locator(`#${processors.nequi.push.elementId}`);
    this.divKlapSodexo = page.locator(`#${processors.klap.sodexo.elementId}`);
    this.divKlapEdenred = page.locator(`#${processors.klap.edenred.elementId}`);
    this.divMercadoPagoWallet = page.locator(`#${processors.mercadoPagoWallet.elementId}`);
    this.divReference = page.locator(`#${processors.volarisReference.elementId}`);
    this.divSpeiOpm = page.locator(`#${processors.speiOpm.elementId}`);
    this.divSafetypay = page.locator(`#${processors.safetypay.elementId}`);
    this.divAstropay = page.locator(`#${processors.astropay.elementId}`);
    this.buttonEmbedPayment = page.locator('button:has-text("Embedir Pago")');
    this.buttonPay = page.locator('[data-baseweb="button"]:has-text("Pagar")');
  }

  async clickOnProcessor(processor: Locator) {
    await processor.evaluate((el) => el.scrollIntoView());
    await this.ensureVisibleToClick(processor);
  }

  async clickOnEmbedPayment() {
    await this.ensureVisibleToClick(this.buttonEmbedPayment);
  }
  async clickOnPay() {
    await this.ensureVisibleToClick(this.buttonPay.nth(1));
  }

  async selectProcessorToOpenModal(processor: string) {
    await this.clickOnProcessor(this[`div${this.capitalizeFirstLetter(processor)}`]);
    await this.clickOnPay();
  }

  async selectProcessorToEmbed(processor: string) {
    await this.clickOnProcessor(this[`div${this.capitalizeFirstLetter(processor)}`]);
    await this.clickOnEmbedPayment();
    await this[`div${this.capitalizeFirstLetter(processor)}`].scrollIntoViewIfNeeded();
  }
}
