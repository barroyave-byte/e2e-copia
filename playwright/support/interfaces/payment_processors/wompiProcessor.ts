import { BaseProcessor } from './baseProcessor';

interface WompiProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  allow_installments: boolean;
  tokenize_on_purchase: boolean;
  external_merchant_id: string;
  identification_type: string;
  automatic_capture?: boolean;
  country_iso?: string;
  flow?: string;
  flow_version?: string;
}

const wompiProcessor: WompiProcessor = {
  name: 'wompi_direct',
  payment_processor_id: 70,
  enabled: true,
  currency_iso3: 'COP',
  public_api_key: 'pub_test_TsTOSwnuhpQ7O7OhtoC7j791IGnVGDBY',
  private_api_key: 'prv_test_5VIUtMVdzxybZpttkJU67TuaRRWNb9Cp',
  allow_installments: true,
  tokenize_on_purchase: true,
  automatic_capture: true,
  external_merchant_id: 'test_integrity_UlCDUH1CHWZ6oVaUy0ODc0b14oflShLx',
  identification_type: 'CC',
};

const wompiProcessorPayconnect: WompiProcessor = {
  name: 'wompi_direct',
  payment_processor_id: 70,
  enabled: true,
  currency_iso3: 'COP',
  public_api_key: 'pub_test_TsTOSwnuhpQ7O7OhtoC7j791IGnVGDBY',
  private_api_key: 'prv_test_5VIUtMVdzxybZpttkJU67TuaRRWNb9Cp',
  allow_installments: true,
  tokenize_on_purchase: true,
  external_merchant_id: 'test_integrity_UlCDUH1CHWZ6oVaUy0ODc0b14oflShLx',
  identification_type: 'CC',
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
};

const wompiProcessorAuthorize: WompiProcessor = {
  ...wompiProcessor,
  automatic_capture: false,
  country_iso: 'CO',
};

export { wompiProcessor, wompiProcessorAuthorize, wompiProcessorPayconnect };
