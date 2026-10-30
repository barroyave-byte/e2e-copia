import { BaseProcessor } from './baseProcessor';

export interface NupayProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  external_merchant_id?: string;
  allow_installments: boolean;
  automatic_capture?: boolean;
  currency_iso3: string;
  country_iso: string;
  countries_excluded_from_id_validation: string[];
  extra_params: {};
  authorization_association_mode?: string;
  use_consent?: boolean;
}

const nupayProcessor: NupayProcessor = {
  name: 'NUPAY',
  payment_processor_id: 79,
  enabled: true,
  currency_iso3: 'BRL',
  country_iso: 'BR',
  automatic_capture: true,
  public_api_key: '6bcad293-9d4c-4811-9109-80d9c944d025',
  private_api_key: 'ZmE3Yzk4MGIzNDMxMTM1OWZmYjYxYjYxMjg4ZWEwYTY=',
  external_merchant_id: '5514471833302',
  allow_installments: true,
  countries_excluded_from_id_validation: ['ALL'],
  extra_params: {
    d: 'm2wRoFtTPjYCGYM1dnjAc7BNCIF5SCG8YzgYXK4JSMI',
    x: 'fnWvGjS1uBWNmVDaM2UAFPtV5-FtrsAteRoRxpte4Ys',
    y: '1BdPclML0Q6kcWliEVCZmMKRETDrwlAj8McHCoLkkvg',
    alg: 'ES256',
    crv: 'P-256',
    kid: 'NTMuNzQzLjAwMC8wMDAxLTQ4LURFVU5BLVRFU1Q=',
    kty: 'EC',
    use: 'sig',
  },
  authorization_association_mode: 'Documento', // TODO - Check this value with the team
  use_consent: true,
};

export { nupayProcessor };
