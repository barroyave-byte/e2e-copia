import { BaseProcessor } from './baseProcessor';

interface KushkiSpreedlyProcessor extends BaseProcessor {
  kushki: { public_merchant_id: string; private_merchant_id: string };
}

const kushkiSpreedlyProcessor: BaseProcessor = {
  name: 'kushki-credit',
  payment_processor_id: 2,
  enabled: true,
};

const kushkiSpreedlyProcessorMX: KushkiSpreedlyProcessor = {
  ...kushkiSpreedlyProcessor,
  currency_iso3: 'MXN',
  kushki: {
    public_merchant_id: '40647c8c0e75436f95c76fe13a7a60ac',
    private_merchant_id: '78bd84d860464486b882b779d1df4812',
  },
};

const kushkiSpreedlyProcessorPE: KushkiSpreedlyProcessor = {
  ...kushkiSpreedlyProcessor,
  currency_iso3: 'PEN',
  country_iso: 'PE',
  kushki: {
    public_merchant_id: '12a5e2a98829459e97c57f55701061d0',
    private_merchant_id: '79f7496c972f4f419769d2212f283ed9',
  },
};

const kushkiSpreedlyProcessorEC: KushkiSpreedlyProcessor = {
  ...kushkiSpreedlyProcessor,
  currency_iso3: 'USD',
  country_iso: 'EC',
  kushki: {
    public_merchant_id: 'ac0de247153742d78ec3139a86a6805f',
    private_merchant_id: '6b3504b8a6c84518bd44ce9439f1b9cf',
  },
};

const kushkiSpreedlyProcessorCO: KushkiSpreedlyProcessor = {
  ...kushkiSpreedlyProcessor,
  currency_iso3: 'COP',
  country_iso: 'CO',
  kushki: {
    public_merchant_id: 'c21ee0b7e26642228918530d61e7ae3f',
    private_merchant_id: '6a31926ac75f41cda25b17d863751127',
  },
};

const kushkiSpreedlyProcessorCL: KushkiSpreedlyProcessor = {
  ...kushkiSpreedlyProcessor,
  currency_iso3: 'CLP',
  country_iso: 'CL',
  kushki: {
    public_merchant_id: '07b5bebb93124ab394114dca663819dd',
    private_merchant_id: '5d6c110a0a8f45a6a677440cb32c6e5c',
  },
};

export {
  kushkiSpreedlyProcessorMX,
  kushkiSpreedlyProcessorPE,
  kushkiSpreedlyProcessorEC,
  kushkiSpreedlyProcessorCO,
  kushkiSpreedlyProcessorCL,
};
