import { randomUUID } from 'crypto';
import {
  ElementsConfig,
  ThemeConfig,
  WidgetsGeneralConfig,
} from '../interfaces/CheckoutConfigurationV2';

export const newConfig =
  '{"theme":{"colors":{"primaryTextColor":"#023047","backgroundSecondary":"#FDF0D5","backgroundPrimary":"#FFFFFF","buttonPrimaryFill":"#C1121F","buttonPrimaryHover":"#780000","buttonPrimaryText":"#FFFFFF","buttonPrimaryActive":"#780000"}},"HeaderPattern":{"overrides":{"Logo":{"props":{"url":"https://cdn.stg.deuna.io/explore-deuna/assets/explore-deuna-icon.svg"}}}},"CardInfoPattern":{"title":"Ingresar los datos de tu tarjeta","subtitle":{"content":"Ingresar los datos de tu tarjeta 🔅"}},"UpperTagPattern":{"title":"This is a custom upper tag","description":"description tag","style":{"boxShadow":"none","marginTop":"16px","backgroundColor":"#E6EFFE"}},"UserCardPattern":{"translations":{"es":{"addNewCard":{"info":"Agregar nueva tarjeta 🙂"},"moreOptions":{"payWith":"👀 Pagar con"},"paymentMethods":{"seeAllMyCards":"Ver mis tarjetas ✅✅","expiredCard":"Tarjeta Expirada","warningExpiredCard":"Selecciona un método de pago disponible.","confirmDeleteMethodTitle":"Eliminar esta tarjeta","deleteMainText":"Eliminar","confirmDeleteMethodAccept":"Confirmar","confirmDeleteMethodCancel":"Cancelar","confirmDeleteMethod":"Ten en cuenta que al eliminarla no podrás restaurarla."}}}},"CardPattern":{"translations":{"es":{"inputs":{"identityNumber":{"label":"this is a custom label"},"identityDocument":{"label":{"CO":"CO: Cédula/Doc de identidad","CL":"CL: RUT/DNI","EC":"EC: Cédula/Doc de identidad","MX":"MX: Número de RFC","BR":"BR: CPF/CNPJ del titular","AR":"AR: DNI/Doc de identidad","UY":"UY: Cédula/Doc de identidad"}},"cardNumber":{"label":"Número de tarjeta especial"},"cardHolder":{"label":"Nombre en la tarjeta"},"installment":{"label":"Cuotas de Pago","withoutInstallments":"Sin cuotas"}}}}},"LowerTagPattern":{"title":"This is a custom lower tag","description":"description tag"},"TermsConditionsPattern":{"showForGuest":true,"showForAuth":false,"legalMessage":"Al continuar aceptas los términos y condiciones","connectorText":"y","hideCompanyDisclaimer":true},"LegalInfoPattern":{"hidePoweredBy":true},"PoweredByPattern":{"url":"https://images-staging.getduna.com/checkout_modular/deuna-logo-sm.svg","imageStyle":{"width":"50px","height":"200px"}},"PaymentButtonPattern":{"label":"Pagar","hidePoweredBy":true,"showOrderTotal":true,"styles":{"padding":"10px 20px","borderRadius":"25px"}},"OtpPage":{"overrides":{"Header":{"props":{"overrides":{"Logo":{"props":{"url":"https://cdn.stg.deuna.io/explore-deuna/assets/explore-deuna-icon.svg"}}}}},"Headings":{"props":{"title":"custom title","description":"enviado a"}},"OtpChangeChannelButton":{"props":{"description":{"sms":"send custom by email","email":"send custom by sms"}}},"ContinueAsGuestButton":{"props":{"description":"continue as custom guest"}}}}}';

export const widgetsGeneralConfig: WidgetsGeneralConfig = {
  theme: {
    main_color: '',
    secondary_color: '',
    background_color: '',
    font: '',
    image: {
      name: '',
    },
    banner: '',
    main_action_button_text: '',
  },
  user_experience: {
    show_saved_cards_flow: false,
    disable_login: true,
  },
  flags: {},
  currencies: {
    minor_units: [],
  },
  checkout_modules: [],
};

export const newElementsConfig: ElementsConfig = {
  init_with_guest_user: true,
  user_authentication_flow: false,
};

export const newThemeConfig: ThemeConfig = [
  {
    id: randomUUID(),
    name: 'new_theme_config',
    config: newConfig,
  },
];

export const getCustomThemeConfig = (config): ThemeConfig => {
  const customConfig = JSON.parse(newConfig);
  customConfig.theme = {
    ...customConfig.theme,
    ...config,
  };
  return [
    {
      id: randomUUID(),
      name: 'new_theme_config',
      config: JSON.stringify(customConfig),
    },
  ];
};

export const getCustomConfig = (config): ThemeConfig => {
  let customConfig = JSON.parse(newConfig);
  customConfig = {
    ...customConfig,
    ...config,
  };
  return [
    {
      id: randomUUID(),
      name: 'new_theme_config',
      config: JSON.stringify(customConfig),
    },
  ];
};
