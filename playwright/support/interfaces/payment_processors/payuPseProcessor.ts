import { BaseProcessor } from './baseProcessor';

type APM = {
  id: Number;
  name: string;
  enabled: boolean;
};

interface PayuPseProcessor extends BaseProcessor {
  apm_included: Array<APM>;
}

const payuPseProcessor: PayuPseProcessor = {
  name: 'PAYU_PSE',
  payment_processor_id: 57, // payu_pse parent id
  enabled: true,
  country_iso: 'CO',
  currency_iso3: 'COP',
  automatic_capture: true,
  external_merchant_id: '511620', // Payu merchant ID
  extra_params: {
    account_id: '516553', // Payu account ID
  },
  private_api_key: 'bjuSxu382vh5d5GjxpRu409wQ2', // Payu API key
  public_api_key: 'jI5ZhgfpWpVoM15', // Payu API Login
  apm_included: [
    {
      id: 27, // payu_pse processor ID
      name: 'PSE',
      enabled: true,
    },
  ],
};

export { payuPseProcessor };
