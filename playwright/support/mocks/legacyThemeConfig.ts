import { ThemeConfig } from '../interfaces/CheckoutConfigurationV2';
import { randomUUID } from 'crypto';

const legacyConfig =
  '{\n  "title": "Pago con tarjeta crédito o débito",\n  "header":{\n    "content": "Ingresa los datos de tu tarjeta"\n  },\n  "hidePoweredBy": true,\n  "saveButton": {\n    "content": "Pagar"\n  },\n  "legalMessageText": "Al hacer clic en comprar, aceptar las",\n  "showOrderTotal": true,\n  "urls": {\n    "termsAndConditions": "https://legal.deuna.com/docs/t%C3%A9rminos-y-condiciones-de-los-sitios-de-e-commerce-provistos-por-fortcar-sa",\n    "privacyPolicy": "https://legal.deuna.com/docs/pol%C3%ADtica-de-privacidad"\n  },\n  "termsAndConditions": {\n    "showForGuest": true,\n    "showForAuth": false\n  },\n  "showOrderTotal": true\n}';

export const legacyThemeConfig: ThemeConfig = [
  {
    id: randomUUID(),
    name: 'legacy_theme_config',
    config: legacyConfig,
  },
];
