export const fullWidgetGuestCustomStyle = {
  theme: {
    colors: {
      primaryTextColor: '#5a51be',
      backgroundPrimary: '#e8e1fd',
      backgroundSecondary: '#FFFFFF',
      buttonPrimaryFill: '#6fccb8',
      buttonPrimaryHover: '#0033cc',
      buttonPrimaryActive: '#ff0000',
      buttonPrimaryText: '#FFFFFF',
      togglePrimaryFill: '#A710E8',
      progressPrimaryFill: '#E8105C',
      inputBorder: '#D9D9DB',
      inputBorderError: '#F1998E',
      inputEnhancerFill: '#1AE1D7',
      inputBorderPositive: '#66D19E',
    },
    typography: {
      primaryFontFamily: 'Lobster',
    },
    buttons: {
      borderRadius: '20px',
      height: '50px',
    },
    inputs: {
      borderRadius: '12px',
      height: '50px',
      inputMode: 'validated',
    },
  },
  HeaderPattern: {
    overrides: {
      Logo: {
        props: {
          url: 'https://live.staticflickr.com/6164/6144091654_cbc351c8e2_b.jpg',
          position: 'center',
          style: {
            'min-width': '100px',
          },
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
              title: 'tarjeta crédito o débito con Custom Styles',
              subtitle: 'Por favor, ingresa los datos de tu tarjeta con Custom Styles',
            },
          },
        },
        inputs: {
          securityCode: {
            tooltipContent: 'Custom tooltip desde custom style',
          },
        },
      },
    },
  },
  CardPattern: {
    translations: {
      es: {
        inputs: {
          identityNumber: {
            label: 'Número de identificación',
          },
          identityDocument: {
            label: {
              CO: 'CO: Documento de identidad',
              CL: 'CL: RUT/DNI',
              EC: 'EC: Cédula / Documento de identidad',
              MX: 'MX: Identificación oficial',
              BR: 'BR: CPF/CNPJ del titular',
              AR: 'AR: DNI o documento equivalente',
              UY: 'UY: Cédula de identidad',
            },
          },
          cardNumber: {
            label: 'Número de la tarjeta',
          },
          cardHolder: {
            label: 'Nombre como aparece en la tarjeta',
          },
          expirationDate: {
            label: 'Vencimiento de la tarjeta',
          },
          securityCode: {
            label: 'Código de seguridad',
          },
          installment: {
            label: 'Elige el número de cuotas',
            withoutInstallments: 'Pago en una sola exhibición',
          },
        },
      },
    },
  },
  UpperTagPattern: {
    title: 'This is a custom upper tag',
    description: ['first description tag', 'second description tag', 'third description tag'],
    style: {
      boxShadow: 'none',
      marginTop: '16px',
      backgroundColor: '#E6EFFE',
    },
  },
  LowerTagPattern: {
    title: 'This is a custom lower tag',
    description: 'custom description tag',
  },
  /**
   * Only `address1` is asserted: it is the one personBilling field that both
   * renders in this widget's checkout_modules config (see spec) and has a
   * dedicated fill locator (inputAddress1) in PaymentDeunaNowPage. firstName /
   * lastName / zipCode / email have no confirmed render path or fill locator
   * for the Payment Widget's BillingPattern in this codebase — see coverage
   * report gap notes rather than guessing a config that can't be driven.
   */
  BillingPattern: {
    translations: {
      es: {
        title: 'Dirección asociada a la tarjeta',
        billingView: {
          title: 'Introduce tu información de facturación',
          cancel: 'Anular',
          save: 'Guardar cambios',
        },
        inputs: {
          personBilling: {
            address1: { label: 'Domicilio' },
          },
        },
      },
    },
  },
  InstallmentsPattern: {
    overrides: {
      NoInstallmentsTooltip: {
        label: '¿Por qué no puedo pagar a meses sin intereses?',
        popoverProps: {
          title: '¿Por qué no puedo pagar a MSI?',
          content: 'por alguna de estas razones:',
          list: [
            'Tu compra es menor a $2,500',
            'Tu tarjeta es de débito',
            'Tu banco no es participante',
            'Los productos no son aplicables a la promoción MSI',
          ],
          listType: 'unordered',
        },
      },
    },
  },
  PriceBreakdownPattern: {
    translations: {
      es: {
        title: 'Detalle de la compra',
      },
    },
  },
  PaymentProcessing: {
    overrides: {
      Progress: {
        props: {
          translations: {
            es: {
              components: {
                progressSteps: {
                  processing: 'procesando con custom style',
                  validating: 'validando con custom style',
                  finalizing: 'finalizando con custom style',
                },
              },
            },
          },
        },
      },
    },
    translations: {
      es: {
        header: {
          title: {
            paymentProcessing: 'Estamos procesando tu orden with CustomStyle',
          },
          subtitle: 'Por favor, no actualices o custom style',
        },
        footer: {
          caption: 'todas tus compras son seguras con custom style',
        },
      },
    },
  },
  TermsConditionsPattern: {
    showForGuest: true,
    showForAuth: false,
    legalMessage: 'Al continuar, aceptas nuestras condiciones de uso.',
    connectorText: 'y',
    hideCompanyDisclaimer: false,
    termsAndConditionsUrl: 'https://www.example.com/terms',
    privacyPolicyUrl: 'https://www.example.com/privacy',
  },
  // PaymentButtonPattern.styles (padding / borderRadius) is intentionally omitted:
  // its borderRadius overrides theme.buttons.borderRadius on the pay button (the only
  // stable button on this surface), so keeping both makes the two keys indistinguishable
  // in the DOM. theme.buttons is the DOM-verifiable one and takes priority here;
  // PaymentButtonPattern.styles stays a visual-only gap (see coverage report 3.6 / 3.9).
  PaymentButtonPattern: {
    label: 'Completar pago por',
    showOrderTotal: true,
  },
  PoweredByPattern: {
    url: 'https://images-staging.getduna.com/checkout_modular/banco-azteca-powered-by-deuna.svg',
    hideText: true,
    hide: false,
    imageStyle: {
      filter: 'grayscale(100%)',
      width: '90%',
      height: 'auto',
    },
  },
};
