import { BaseProcessor } from './baseProcessor';

interface ExpirationTimes {
  pending: number;
}

interface ExtraParams {
  refund_expiration_in_days: number;
}

interface FemsaOxxoCashProcessor extends BaseProcessor {
  expiration_times: ExpirationTimes;
  extra_params: ExtraParams;
}

export const femsaOxxoCashProcessor: FemsaOxxoCashProcessor = {
  name: 'femsa_oxxo_cash',
  payment_processor_id: 121,
  enabled: true,
  country_iso: 'MX',
  currency_iso3: 'MXN',
  automatic_capture: true,
  private_api_key: 'key_sKNhJlcnNi6aI68klG8zakS',
  merchant_pwd: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0NCk1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBeWxialpEWEhjRnMvMHMyNC8wdmsNCitKVDBwbmNQRExVV2plSy9QMWw0ZGVMcDFqYzZXWVNOb0thQ0Fwd2FFcFg1Nlo3YXVEMnd1WjdRLy85bnVZM1INCjdJU0IrMWtOeUl5OGlvQ1RmdHRnc3Jab0Y0aEUrajZwTE8xMTIrU2VlMUR6K0ljcHhGUEZKMCtDSDRpRE9vNEoNCi9Ja1JVc0J1Z3phYkRJaVhUT0twcDNqMFFtM0hMdmZqOGpWNzdYZDQyZlFlQ3prcWY0Y2gwS0wrdFBrVkdUazQNCkFGSFY3Y1V3N0NFVU9XQlRIZlZPekt3OFZ4N2xPRCsrYzlBdGFQUGR1QVpCTEdvamlQSjJ2NVFFSTNoMXdyV2oNCjJJTTc0L3V1b2twd1hFVFFOR3A5eVlpejQ5RXFJa2ppMEtKOFZyeXJweFF0cmVWSmNQV3ZhZ1FXK2crTzN3dHcNCk13SURBUUFCDQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0=', // webhook key,
  expiration_times: {
    pending: 20,
  },
  extra_params: {
    refund_expiration_in_days: 7,
  },
};
