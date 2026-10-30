// This CustomStyle adheres to the Official Documentation.
// Do not modify property names or values to maintain compatibility.

export const customStyleForElektra = {
  theme: {
    colors: {
      primary: '#ff0000',
      primaryTextColor: '#5a51be',
      backgroundSecondary: '#FFFFFF',
      backgroundPrimary: '#e8e1fd',
      buttonPrimaryFill: '#6fccb8',
      buttonPrimaryHover: '#0033cc',
      buttonPrimaryActive: '#ff0000',
    },
    typography: {
      primaryFontFamily: 'Roboto',
    },
  },
  PaymentMethodsPattern: {
    translations: {
      es: {
        paymentMethods: {
          info: {
            card: {
              title: 'tarjeta crédito o débito',
              subtitle: 'Ingresa los datos de tu tarjeta Visa, MasterCard o AMEX.',
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
            label: 'Mensualidades',
            withoutInstallments: 'Pago en una sola exhibición',
          },
        },
      },
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
  BillingWithSameData: {
    props: {
      title: 'Datos de facturación',
    },
    translations: {
      es: {
        title: 'Dirección de la tarjeta',
      },
    },
  },
  PriceBreakdownPattern: {
    props: {
      fields: [
        {
          name: 'header_title',
          label: 'Resumen',
        },
      ],
    },
    translations: {
      es: {
        title: 'Resumen de pedido',
      },
    },
  },
};
