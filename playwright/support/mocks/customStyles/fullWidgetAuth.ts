export const fullWidgetAuthCustomStyle = {
  theme: {
    colors: {
      primaryTextColor: '#5a51be',
      backgroundPrimary: '#e8e1fd',
      backgroundSecondary: '#FFFFFF',
      buttonPrimaryFill: '#6fccb8',
      buttonPrimaryHover: '#0033cc',
      buttonPrimaryActive: '#ff0000',
      buttonPrimaryText: '#FFFFFF',
    },
    typography: {
      primaryFontFamily: 'Lobster',
    },
  },
  CardPattern: {
    translations: {
      es: {
        addNewCard: {
          info: 'Añadir una nueva tarjeta (custom)',
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
                style: { 'min-width': '100px' },
              },
            },
          },
        },
      },
      Headings: {
        props: {
          title: 'Verificación en curso con CustomStyle',
          description: 'Introduce el código con custom style que te hemos enviado.',
        },
      },
      OtpChangeChannelButton: {
        props: {
          description: {
            sms: 'Recibir código en tu correo (custom)',
            email: 'Recibir código por SMS (custom)',
          },
        },
      },
      OtpResendButton: {
        props: {
          description: 'Solicitar nuevo código (custom)',
        },
      },
      ContinueAsGuestButton: {
        props: {
          description: 'Seguir sin ingresar código (custom)',
        },
      },
      OtpPattern: {
        props: {
          timeout: 3,
        },
      },
    },
  },
  /**
   * requiresAcceptance / showForGuest are irrelevant here: A2 only cares that the
   * disclaimer is HIDDEN for the auth view. showForGuest stays true so the guest
   * baseline (A1) is untouched if this mock is ever reused there.
   */
  TermsConditionsPattern: {
    showForGuest: true,
    showForAuth: false,
    legalMessage: 'Al continuar, aceptas nuestras condiciones de uso.',
    connectorText: 'y',
    hideCompanyDisclaimer: true,
    termsAndConditionsUrl: 'https://www.example.com/terms',
    privacyPolicyUrl: 'https://www.example.com/privacy',
  },
  LegalInfoPattern: {
    hidePoweredBy: true,
  },
  PaymentButtonPattern: {
    label: 'Completar pago por',
    showOrderTotal: true,
    hidePoweredBy: true,
  },
  UserCardPattern: {
    translations: {
      es: {
        moreOptions: {
          payWith: 'Usar tarjeta seleccionada (custom)',
        },
        paymentMethods: {
          seeAllMyCards: 'Mostrar todas mis tarjetas (custom)',
          expiredCard: 'Esta tarjeta ya no es válida (custom)',
          warningExpiredCard: 'Selecciona otro método de pago (custom)',
          confirmDeleteMethodTitle: '¿Eliminar tarjeta? (custom)',
          deleteMainText: 'Eliminar tarjeta (custom)',
          confirmDeleteMethodAccept: 'Sí, eliminar (custom)',
          confirmDeleteMethodCancel: 'No, cancelar (custom)',
          confirmDeleteMethod: 'Una vez eliminada, esta tarjeta no podrá recuperarse (custom).',
        },
      },
    },
  },
};
