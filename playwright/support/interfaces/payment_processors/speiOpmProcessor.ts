import { BaseProcessor } from './baseProcessor';

interface SpeiOpmProcessorExtraParams {
  privateKey: string;
  bankCode: string;
  branchCode: string;
  integratorCode: string;
  costCenterCode: string;
}

interface SpeiOpmProcessor extends BaseProcessor {
  external_merchant_id: string;
  private_api_key: string;
  public_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  allow_network_token?: boolean;
  flow: string;
  flow_version: string;
  time_to_expire: string;
  extra_params: SpeiOpmProcessorExtraParams;
}

const createSpeiOpm = (): SpeiOpmProcessor => ({
    name: 'SPEI_OPM',
    payment_processor_id: 117,
    enabled: true,
    currency_iso3: 'MXN',
    public_api_key: '4661374d61089f7a8714847ac8bdf71006a77997f1826a85f7deed26d6348fd8',
    private_api_key: '',
    external_merchant_id: '',
    allow_installments: false,
    automatic_capture: true,
    time_to_expire: "1440",
    country_iso: 'MX',
      flow: 'payconnect',
      flow_version: 'multi_step_workflow',
      enable_3ds_authentication: false,
      extra_params:{
          privateKey:'LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFdkFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLWXdnZ1NpQWdFQUFvSUJBUUNMMW5jV3lPRTlONGRjVXlDTkRjT1hVUmNyQ1c4bWdSNmFSRDdDOE4vc0V5UTBpMnZlNmNZUG1RTzZKU1NweWJQNlBSWnVubldFcWxJN2VHdmd1N09QdWMxL2hZMzNKb0FWSlJxMjRVU2hDY1YyNG5tem5FcnU2aU9acUVIamh4K1hIZmpCSGhTUXJGTVd1dkl5a3RFR0FtckdiREdWOWszNTQwVUEraHpRNzlNTU9taVJhZ2E4WmQwc3RnK3Y0M1phU0JFb21nQ0pPWVM3VnlBSkgyb2lhM1NXMXVxd2c4Y0lKMm0rQmNEUnZER2tCVERzTHQwQTkzcmZ4Qzc1aU1XRjN0dkxrNHdFTm42cXJ4K1dtQ1JkVkN3VFpZVkdJei9ab1U4WEk4bm0xTUN5WW0vT0RBdElTdWpSMUx2anVZUmJWLzBKWUVjSUN4ZkMrb2tnWi9xRkFnTUJBQUVDZ2dFQU94a0RNV1RxRkFZUXRjc0gyYlQwY1ZHNitkdzkxa2NCV083NG0waFRTaUQ0enlBUkVaODRya1RibDJLMU1QQm1tSjRTaWVOOEJQbzZVSm5lOVpZK0Y4TE5mMVJCSUM5c09BTjdXOGl1U1dTb3lFcUVab3pwK2ppSG5Sdkg1TkdwWHlNeWl1TWNpOXZZTGFZS1Q2ZE9vVHlLUlp0YUJXZVhvc0VTMjR2WWU5QU5TejU3dXQ3NHJsL0g1WTNQaVdzeUtjV096REJsdm9lOWZLZmJQbkJvNFZlbjU0cGtxQXhvbXVBKzNTS3dMbDJSVHZRaldIVzA1ME9XYjliU2NoWnBqaFFUUTB4dHVValNWSlhJR0hjTjBWNm5rTmxsV0NkM0gzZi9KWmF4NmgydEJkUnR3R2hyWUtqU1BrdmI2eEtEbzQvSFNTc3BqNVhDcGZLUitYeDJZUUtCZ1FEY3g5bjR4bWRtcVNncHdTeFNIblZRQkpCYngxa1FDN2ZnVEdMUGNPSy9ybERBMUZKeFZHV1RmdW9vaUlXbGFUYUExc29KcUgwWnlPMkFmYmFYLzJMNmZXS3pvZVB6bWtKTG5odUdVdmNDM0NvWEIxb2drNEk3Nmg1NFNEeDhqeHJoNklZMWVGa01GeElxVXhCcWNKelNWRlZGS0xwbEM3RWM5anJaT2oxUnZRS0JnUUNpSlJuU1EydUVnbnZwZy9xYXZTSVE5Tk84cGFyck8xS3JlMmtiMThRNERDZG9xenRlelF2Ky9ObS9rSm8wdmhYNzliOXFqQXdTUmdUWGZ4ZUJOZ1BiUnhBTWpRZitlZlVnay80d3hXcWgyMEowenMrUCtpSTFzeW5KbXA0MnlyTzJsaWtoNnFXSUxpUldOT3BTcVQ1ZXNXRjM2dFJaWlphQ1Z3Nmo5MHlFYVFLQmdFUzVNUEJ2VWVCeTV6MllFK083OTJoaEEwNk9UdnJmcXV6MjJnc1lhSHlpRmlEdjlubXdlNjNkNDZXYVdYK1RzSk9LU0htWktOZk40NkFMZ2JydWxEREV0dVNUa0JGVUF5N21tRXJIcUh3TGJFNmV5ejg0cTJGYkR3RUIrMUlLZWFPNGJZNVhWK0NiamR2KzN5MUN3STM0RWxMa3lxQ0pjeWhBdlREQklEVkJBb0dBWE5jcmVzWlp5TXpCMElwZU1yMjZ4TVM2ZkJqTHpkYncxZmxhekxOMXliWEQxdDI4cCtKMlRQRlFhS3lPYjBhcjVkSG5ZVVdCSC9GeGtrWldHZ2pvbW1TTkh2S2RzaXI0blVlLzB3TW10RGlNUzcraS8waDAwQlNmQjYxOWk5ZnlvTWhJRXdCOCtZV2FEclpMdVRybzJHVnVickJLR0VuZnJRL1Y5VEtEWUlrQ2dZQTdiR25FbzlndDRrVHBMeEQ3a2xNejFoMXVyOGFHK2Y2SmNVbHNGRkFETGhjZzZtOU82NXdDdE11elNvVHFoVzAyRkZCTWtBYmxodGRzWlNrbkxDZzlpWGFZNVY0OUtOWVU4Z0psNDNqYUtVd0N1U25VZXQzN21aM3lRc2xuSXZLYU05ckcvWWhnUmIrNjhyaXRCMkJncm1WdUFpTlhRUzloWTNKOWNEQ3Uzdz09Ci0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==',
          bankCode:'684',
          branchCode:'180',
          integratorCode:'250',
          costCenterCode:'001'
      }
});

export { createSpeiOpm, SpeiOpmProcessor };
