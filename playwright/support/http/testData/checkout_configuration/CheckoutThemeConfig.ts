/**
 * Preset theme configurations for checkout theme tests.
 *
 * THEME_BASE_COLORS       → simple setup fixture used in PLAT tests (T1402, T1404, T1406 beforeAll)
 * THEME_FULL_CONFIG       → full body matching CHECKOUT_THEMES collection create-ok (PLAT-T1400, ENTP1-T2027)
 * THEME_PAYMENT_LINK_COLORS → default colors from PAYMENT_LINK_THEMES collection (ENTP1 payment link tests)
 * THEME_THANK_YOU_VIEW    → ThankYouView translations shared across ENTP1 tests (T2094, T2115, T2164)
 */

/** Simple color config used as prerequisite in PLAT update / delete / get-all tests */
export const THEME_BASE_COLORS = {
  theme: {
    colors: {
      primaryTextColor: '#323237',
      backgroundSecondary: '#FFFFFF',
      backgroundPrimary: '#FFFFFF',
      buttonPrimaryFill: '#17171A',
      buttonPrimaryHover: '#69696E',
      buttonPrimaryText: '#FFFFFF',
      buttonPrimaryActive: '#5F529E',
    },
  },
};

/** Full config matching the CHECKOUT_THEMES Postman collection create-ok request body */
export const THEME_FULL_CONFIG = {
  theme: {
    colors: {
      primaryTextColor: '#323237',
      backgroundSecondary: '#FFFFFF',
      backgroundPrimary: '#FFFFFF',
      buttonPrimaryFill: '#17171A',
      buttonPrimaryHover: '#69696E',
      buttonPrimaryText: '#FFFFFF',
      buttonPrimaryActive: '#5F529E',
    },
  },
  HeaderPattern: {
    overrides: {
      Logo: {
        props: {
          url: 'https://live.staticflickr.com/6164/6144091654_cbc351c8e2_b.jpg',
        },
      },
    },
  },
  PaymentMethodsPattern: {
    translations: {
      es: {
        paymentMethods: {
          info: {
            card: {
              title: 'Title from postman collection',
              subtitle: 'Subtitle from postman collection',
            },
          },
        },
      },
    },
  },
  UpperTagPattern: {
    title: 'Tienes 10% de descuento con E2E',
    description: 'Debido a que tu tarjeta es mastercard, tienes descuento',
    style: {
      color: '#F6F7EB',
      backgroundColor: '#E94F37',
    },
  },
  UserCardPattern: {
    translations: {
      es: {
        addNewCard: { info: 'Agregar una tarjeta' },
        moreOptions: { payWith: 'Tarjeta seleccionada' },
        paymentMethods: {
          seeAllMyCards: 'Ver tarjetas guardadas',
          expiredCard: 'Tarjeta expirada',
          warningExpiredCard: 'Selecciona un método de pago disponible',
          confirmDeleteMethodTitle: 'Eliminar esta tarjeta',
          deleteMainText: 'Eliminar',
          confirmDeleteMethodAccept: 'Confirmar',
          confirmDeleteMethodCancel: 'Cancelar',
          confirmDeleteMethod: 'Ten en cuenta que al eliminarla no podrás restaurarla.',
        },
      },
    },
  },
  CardPattern: {
    translations: {
      es: {
        inputs: {
          identityNumber: { label: 'Número de documento' },
          identityDocument: {
            label: {
              CO: 'CO: Cédula / Doc de identidad',
              CL: 'CL: RUT/DNI',
              EC: 'EC: Cédula / Doc de identidad',
              MX: 'MX: Otro documento',
              BR: 'BR: CPF/ CNPJ del titular',
              AR: 'AR: DNI / Doc de identidad',
              UY: 'UY: Cédula / Doc de identidad',
            },
          },
          cardNumber: { label: 'Número de tarjeta' },
          cardHolder: { label: 'Nombre en la tarjeta' },
          installment: {
            label: 'Selecciona las cuotas',
            withoutInstallments: 'Sin cuotas',
          },
        },
      },
    },
  },
  LowerTagPattern: {
    title: 'Tienes 10% de descuento',
    description: 'Debido a que tu tarjeta es mastercard, tienes descuento',
    style: {
      color: '#F6F7EB',
      backgroundColor: '#E94F37',
    },
  },
  TermsConditionsPattern: {
    showForGuest: true,
    showForAuth: false,
    legalMessage: 'Al continuar aceptas las',
    connectorText: 'y',
    hideCompanyDisclaimer: false,
  },
  PaymentButtonPattern: {
    label: 'Pagar',
    showOrderTotal: 'true',
    styles: {
      padding: '10px 20px',
      borderRadius: '25px',
    },
  },
  LegalInfoPattern: {
    hidePoweredBy: true,
  },
  OtpPage: {
    overrides: {
      Header: {
        props: {
          overrides: {
            Logo: {
              props: {
                url: 'https://live.staticflickr.com/6164/6144091654_cbc351c8e2_b.jpg',
              },
            },
          },
        },
      },
      Headings: {
        props: {
          title: 'Ingresa el código de verificación',
          description: 'Para ver tus tarjetas guardadas ingresa el código enviado a',
        },
      },
      OtpChangeChannelButton: {
        props: {
          description: {
            sms: 'Enviar código por correo',
            email: 'Enviar código por SMS',
          },
        },
      },
      ContinueAsGuestButton: {
        props: {
          description: 'Continuar sin ingresar el código',
        },
      },
    },
  },
};

/** Default colors used in Payment Link theme tests — matches PAYMENT_LINK_THEMES collection defaults */
export const THEME_PAYMENT_LINK_COLORS = {
  colors: {
    primaryTextColor: '#414288',
    backgroundSecondary: '#98DFAF',
    backgroundPrimary: '#DEEFB7',
    buttonPrimaryFill: '#98DFAF',
    buttonPrimaryHover: '#98DFAF',
    buttonPrimaryText: '#DEEFB7',
    buttonPrimaryActive: '#DEEFB7',
  },
};

/**
 * Fixed patterns from the PAYMENT_LINK_THEMES Postman collection create-ok request body.
 * Spread alongside a `theme` field to build the full config:
 *   { theme: myThemeContent, ...THEME_PAYMENT_LINK_PATTERNS }
 */
export const THEME_PAYMENT_LINK_PATTERNS = {
  PoweredByPattern: {
    url: 'https://images-staging.getduna.com/checkout_modular/banco-azteca-powered-by-deuna.svg',
    hideText: true,
    imageStyle: {
      filter: 'none',
      width: '150px',
    },
  },
  OtpPage: {
    overrides: {
      Header: {
        props: {
          overrides: {
            Logo: {
              props: {
                url: 'https://1000logos.net/wp-content/uploads/2021/05/Coca-Cola-logo.png',
                position: 'center',
                style: { 'min-width': '150px' },
              },
            },
          },
        },
      },
      Headings: {
        props: {
          title: 'Ingresa el código de verificación 🚀',
          description: 'Para ver tus tarjetas guardadas ingresa el código enviado a 🚀',
        },
      },
      OtpChangeChannelButton: {
        props: {
          description: {
            sms: 'Enviar código por correo 🚀',
            email: 'Enviar código por SMS 🚀',
          },
        },
      },
      ContinueAsGuestButton: {
        props: { description: 'Continuar sin ingresar el código 🚀' },
      },
    },
  },
  CardInfoPattern: {
    title: 'Pago con tarjeta de crédito o débito 🚀',
    subtitle: { content: 'Ingresa los datos de tu tarjeta 🚀' },
  },
  CardPattern: {
    translations: {
      es: {
        inputs: {
          identityNumber: { label: 'Número de documento 🚀' },
          identityDocument: {
            label: {
              CO: 'CO: Cédula / Doc de identidad',
              CL: 'CL: RUT/DNI',
              EC: 'EC: Cédula / Doc de identidad',
              MX: 'MX: Otro documento',
              BR: 'BR: CPF/ CNPJ del titular',
              AR: 'AR: DNI / Doc de identidad',
              UY: 'UY: Cédula / Doc de identidad',
            },
          },
          cardNumber: { label: 'Número de tarjeta 🚀' },
          cardHolder: { label: 'Nombre en la tarjeta 🚀' },
          installment: {
            label: 'Selecciona las cuotas 🚀',
            withoutInstallments: 'Sin cuotas 🚀',
          },
        },
      },
    },
  },
  TermsConditionsPattern: {
    showForGuest: true,
    showForAuth: false,
    legalMessage: 'Al continuar aceptas las 🚀',
    connectorText: 'y 🚀',
    hideCompanyDisclaimer: false,
  },
  PaymentButtonPattern: {
    label: 'Pagar 🚀',
    hidePoweredBy: false,
    showOrderTotal: true,
    styles: {
      padding: '10px 20px',
      borderRadius: '25px',
    },
  },
  HeaderPattern: {
    overrides: {
      Logo: {
        props: {
          url: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Logo_del_Gobierno_de_M%C3%A9xico_%282018%29.png',
          position: 'center',
          style: { 'min-width': '150px' },
        },
      },
    },
  },
  ThankYouView: {
    translations: {
      es: {
        thankYouPage: {
          status: {
            succeeded: 'Thank You!!!!',
            pending: 'pndxing',
            denied: 'denied jlkhjkh',
          },
        },
      },
    },
    overrides: {
      Actions: {
        props: {
          hideDownloadAction: true,
          hideBackToCommerceAction: true,
          downloadText: 'Donload css',
          backText: 'back text css',
        },
      },
      Body: {
        props: { title: 'Desde Custom Style' },
      },
    },
  },
  UserCardPattern: {
    translations: {
      es: {
        addNewCard: { info: 'Agregar una tarjeta 🚀' },
        moreOptions: { payWith: 'Tarjeta seleccionada 🚀' },
        paymentMethods: {
          seeAllMyCards: 'Ver tarjetas guardadas 🚀',
          expiredCard: 'Tarjeta expirada 🚀',
          warningExpiredCard: 'Selecciona un método de pago disponible 🚀',
          confirmDeleteMethodTitle: 'Eliminar esta tarjeta 🚀',
          deleteMainText: 'Eliminar 🚀',
          confirmDeleteMethodAccept: 'Confirmar 🚀',
          confirmDeleteMethodCancel: 'Cancelar 🚀',
          confirmDeleteMethod: 'Ten en cuenta que al eliminarla no podrás restaurarla. 🚀',
        },
      },
    },
  },
};
