// This CustomStyle adheres to the Official Documentation.
// Do not modify property names or values to maintain compatibility.

export const newCustomStyle = {
  theme: {
    colors: {
      primaryTextColor: '#5a51be',
      backgroundSecondary: '#FFFFFF',
      backgroundPrimary: '#e8e1fd',
      backgroundHover: '#EFEEF0',
      buttonPrimaryFill: '#6fccb8',
      buttonPrimaryHover: '#0033cc',
      buttonPrimaryActive: '#ff0000',
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
    },
    inputs: {
      borderRadius: '50%',
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
  OtpPage: {
    overrides: {
      Header: {
        props: {
          overrides: {
            Logo: {
              props: {
                url: 'https://cdn.stg.deuna.io/explore-deuna/assets/explore-deuna-icon.svg',
              },
            },
          },
        },
      },
      Headings: {
        props: {
          title: 'Verificación en curso',
          description: 'Introduce el código que te hemos enviado para continuar.',
        },
      },
      OtpChangeChannelButton: {
        props: {
          description: {
            sms: 'Recibir código en tu correo',
            email: 'Recibir código por SMS',
          },
        },
      },
      OtpResendButton: {
        props: {
          description: 'Solicitar nuevo código',
        },
      },
      ContinueAsGuestButton: {
        props: {
          description: 'Seguir sin ingresar código',
        },
      },
      OtpPattern: {
        props: {
          timeout: 3,
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
              title: 'tarjeta crédito o débito',
              subtitle: 'Por favor, ingresa los datos de tu tarjeta',
            },
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
  TermsConditionsPattern: {
    showForGuest: true,
    showForAuth: false,
    legalMessage: 'Al continuar, aceptas nuestras condiciones de uso.',
    connectorText: 'y',
    hideCompanyDisclaimer: false,
    termsAndConditionsUrl: 'https://www.example.com/terms',
    privacyPolicyUrl: 'https://www.example.com/privacy',
  },
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
  UserCardPattern: {
    translations: {
      es: {
        addNewCard: {
          info: 'Añadir una nueva tarjeta',
        },
        moreOptions: {
          payWith: 'Usar tarjeta seleccionada',
        },
        paymentMethods: {
          seeAllMyCards: 'Mostrar todas mis tarjetas',
          expiredCard: 'Esta tarjeta ya no es válida',
          warningExpiredCard: 'Selecciona otro método de pago',
          confirmDeleteMethodTitle: '¿Eliminar tarjeta?',
          deleteMainText: 'Eliminar tarjeta',
          confirmDeleteMethodAccept: 'Sí, eliminar',
          confirmDeleteMethodCancel: 'No, cancelar',
          confirmDeleteMethod: 'Una vez eliminada, esta tarjeta no podrá recuperarse.',
        },
      },
    },
  },
};
