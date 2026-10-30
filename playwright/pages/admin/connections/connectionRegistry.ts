import { Page } from '@playwright/test';
import { Processor } from '@pages/admin/connections/baseConfigConnectionPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as ConnectionsProcessor from '@pages/admin/connections/processors/index';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export class ProcessorRegistry {
  private static processors: {
    [key in ConnectionsAvailable]?: new (page: Page, languageCode: LanguageCodes) => Processor;
  } = {};

  static registerProcessor(
    connectionName: ConnectionsAvailable,
    processorClass: new (page: Page, languageCode: LanguageCodes) => Processor
  ): void {
    this.processors[connectionName] = processorClass;
  }

  static getProcessor(
    page: Page,
    languageCode: LanguageCodes,
    connectionName: ConnectionsAvailable
  ): Processor {
    const ProcessorClass = this.processors[connectionName];
    if (!ProcessorClass) {
      throw new Error(`No processor found for ${connectionName}`);
    }
    return new ProcessorClass(page, languageCode);
  }
}

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.kushki,
  ConnectionsProcessor.KushkiConnection
);
ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.conekta,
  ConnectionsProcessor.ConektaConnection
);
ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.mercadopago,
  ConnectionsProcessor.MercadoPagoConnection
);
ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.sift,
  ConnectionsProcessor.SiftFraudConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.signifyd,
  ConnectionsProcessor.SignifydFraudConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.cybersourceFraud,
  ConnectionsProcessor.CybersourceFraudConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.cybersource,
  ConnectionsProcessor.CybersourceConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.clearsale,
  ConnectionsProcessor.ClearsaleFraudConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.clearsalebrasil,
  ConnectionsProcessor.ClearsalebrasilFraudConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.aplazo,
  ConnectionsProcessor.AplazoConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.stripe,
  ConnectionsProcessor.StripeOAuthConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.stripeDirect,
  ConnectionsProcessor.StripeDirectConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.worldpay,
  ConnectionsProcessor.WorldpayConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.nupay,
  ConnectionsProcessor.NupayConnection
);

ProcessorRegistry.registerProcessor(ConnectionsAvailable.amex, ConnectionsProcessor.AmexConnection);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.dlocal,
  ConnectionsProcessor.DlocalConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.riskified,
  ConnectionsProcessor.RiskifiedFraudConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.payuOxxo,
  ConnectionsProcessor.PayUOxxoConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.accertify,
  ConnectionsProcessor.AccertifyFraudConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.openpay,
  ConnectionsProcessor.OpenpayConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.globalpay,
  ConnectionsProcessor.GlobalPayConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.unlimit,
  ConnectionsProcessor.UnlimitConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.bazGateway,
  ConnectionsProcessor.BazGatewayConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.mercadopagoWallet,
  ConnectionsProcessor.MercadoPagoWalletConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.volarisReference,
  ConnectionsProcessor.ReferenceConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.speiOpm,
  ConnectionsProcessor.SpeiOpmConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.safetypay,
  ConnectionsProcessor.SafetypayConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.prosa,
  ConnectionsProcessor.ProsaConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.kount,
  ConnectionsProcessor.KountFraudConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.placeToPay,
  ConnectionsProcessor.PlaceToPayConnection
);

ProcessorRegistry.registerProcessor(
  ConnectionsAvailable.ebanx,
  ConnectionsProcessor.EbanxConnection
);
