// This CustomStyle adheres to the Official Documentation.
// Do not modify property names or values to maintain compatibility.

export const customStyleForSplitPayment = {
  theme: {
    colors: {
      primaryTextColor: '#5a51be',
      backgroundSecondary: '#FFFFFF',
      backgroundPrimary: '#e8e1fd',
      buttonPrimaryFill: '#6fccb8',
      buttonPrimaryHover: '#0033cc',
      buttonPrimaryActive: '#ff0000',
      buttonPrimaryText: '#FFFFFF',
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
  SplitPaymentPage: {
    translations: {
      es: {
        stepper: {
          backToSinglePayment: 'Volver a pago único',
          label: 'Dividir en 2 tarjetas',
          stepLabel: 'Etapa %{current} de %{count}',
        },
        common: {
          change: 'Modificar',
          quotes: 'Plazos',
          cardLabel: 'Tarjeta %{ordinal}',
          amountToPay: 'Cantidad a abonar',
          totalAmontLabel: 'Monto total:',
          enterCardDataLabel: 'Completa la información de tu tarjetota',
          splitPaymentsFirstStepBillingTitle: 'Información de facturación',
          splitPaymentsOtherStepsBillingTitle: 'Información de facturación %{ordinal} tarjeta',
        },
        firstStep: {},
        lastStep: {
          title: 'Detalles del pagazo',
          cardSummary: {
            title: 'Tarjeta %{ordinal}',
            editCardLabel: 'Modificar',
            amountToPay: 'Cantidad a abonar',
            installmentsLabel: 'Plazos',
          },
        },
        ordinals: {
          '1': 'La primera',
          '2': 'La segunda',
          '3': 'La tercera',
          '4': 'La cuarta',
          '5': 'La quinta',
          '6': 'La sexta',
          '7': 'La séptima',
          '8': 'La octava',
          '9': 'La novena',
          '10': 'La décima',
        },
        amountToPayCard: {
          title: 'Cantidad a abonar',
          remainingAmontLabel: 'Importe pendiente',
          errorMessages: {
            amountMustBeGreaterThanZero: 'El importe debe ser superior a 0',
            greaterThanTotal: 'El importe debe ser inferior al total a pagar.',
            splitPaymentIsRequired:
              "Debes dividir el importe para seguir o hacer clic en 'Volver a pago único' arriba.",
          },
        },
        footerButton: {
          goToCard2: 'Avanzar a la segunda',
          goToCard3: 'Avanzar a la tercera',
          goToCard4: 'Avanzar a la cuarta',
          goToPurchase: 'Ver resumen de pago',
        },
        inputs: {
          card: {
            error_messages: {
              default: 'Ha ocurrido un error. Por favor, inténtalo nuevamente.',
              cvvErrorFormat: 'El CVV/CVC es incorrecto.',
              expirationDateFormat: 'Tu tarjeta ha caducado.',
              cardNotSupported: 'El número de tarjeta es inválido.',
              notDataEntered: 'Introduce una tarjeta',
              expirationDateRequired: 'Introduce fecha de caducidad',
              fill_all_fields: 'Es necesario completar todos los campos',
            },
          },
          cardHolder: {
            label: 'Nombre tal como aparece en la tarjeta',
            errorMessage: 'No uses acentos ni caracteres especiales (á,@,#).',
            placeholder: 'Ej. Pedro García',
          },
          cardNumber: {
            label: 'Número de la tarjeta',
            error_message: 'Número de tarjeta inválido.',
            placeholder: '0000 0000 0000 0000',
          },
          expirationDate: {
            label: 'Fecha de caducidad',
            errorMessages: {
              expiredCard: 'Tu tarjeta ha caducado.',
              invalidMonth: 'El mes debe estar entre 01 y 12.',
              invalidFormat: 'Formato incorrecto.',
            },
            placeholder: 'MM / AA',
          },
          securityCode: {
            title: 'Código de seguridad',
            description:
              ' Para finalizar tu compra, introduce el código de seguridad (CVV) ubicado en el reverso de tu tarjeta.',
            label: 'CVV',
            error_message: 'El CVV/CVC es incorrecto.',
            placeholder: '000',
            select_another_method: 'Elegir otro método de pago',
            tooltipContent:
              'Código de 3 o 4 dígitos en la parte trasera de tu tarjeta o en la aplicación de tu banco si es virtual.',
          },
          identityDocument: {
            label: {
              CO: 'Cédula / Documento identidad',
              CL: 'RUT/DNI',
              EC: 'Cédula / Documento identidad',
              MX: 'RFC',
              BR: 'CPF/ CNPJ del propietario',
              AR: 'DNI / Documento identidad',
              UY: 'Cédula / Documento identidad',
            },
            validations: {
              invalid: 'El documento de identidad es inválido.',
            },
          },
          identityNumber: {
            label: 'Documento identidad',
            placeholder: 'Documento identidad',
            error_message: 'El documento de identidad es inválido.',
            invalid_by_country: {
              BR: 'Ingresa un CPF o CNPJ válido.',
            },
          },
          installment: {
            label: 'Plazos',
            default_installment_label: '%{payBy} %{installments} x %{amount}',
            custom_installment_label: '%{installmentDisplayLabel} x %{amount}',
            pay_by: 'Abona en',
            first_pay: 'Primer abono',
            monthly_rate: 'Tasa mensual %{monthlyRate}%',
            months: '%{months} meses',
            without_interest: 'Sin intereses ',
            without_installments: 'Sin plazos',
            loading: 'Verificando plazos...',
          },
          userDocumentId: {
            label: 'Documento de identificación',
            placeholder: 'Número documento',
            CC: 'C.C. (Cédula Ciudadanía)',
            CE: 'C.E. (Cédula Extranjería)',
            DE: 'D.E. (Documento Identificación Extranjero)',
            NIT: 'NIT (Número Identificación Tributaria)',
            PP: 'Pasaporte',
            RC: 'R.C. (Registro Civil)',
            TI: 'T.I. (Tarjeta Identidad)',
            CEL: 'CEL (Número móvil)',
            IDC: 'IDC (Identificador único cliente)',
            validations: {
              invalid: 'Documento identidad no válido',
              typeMissing: 'Falta el tipo de documento. Esto no debería ocurrir.',
            },
          },
          cardAmount: {
            errorMessages: {
              amountInvalid: 'Importe a pagar inválido',
              amountMustBeLessThanTotal: 'El importe debe ser menor al total',
              amountMustBeGreaterThanZero: 'El importe debe ser mayor a cero',
            },
          },
          financialInstitution: {
            label: 'Entidad bancaria',
            placeholder: 'Elige un banco',
          },
          errors: {
            phoneInvalid: 'Teléfono inválido',
            inputRequired: 'Campo obligatorio',
          },
        },
        useSameBillingCheckbox: {
          label: 'Usar los mismos datos de facturación de la primera tarjeta.',
        },
        alertMessages: {
          orderChange: {
            title: 'Importe actualizado',
            message: 'El importe ha sido modificado. Por favor, revisa la información nuevamente.',
          },
        },
      },
    },
  },
  UserCardPattern: {
    translations: {
      es: {
        addNewCard: {
          info: 'Registrar nueva tarjeta',
        },
        moreOptions: {
          payWith: 'Pagar con tarjeta seleccionada',
        },
        paymentMethods: {
          seeAllMyCards: 'Ver todas mis tarjetas',
          expiredCard: 'Esta tarjeta ya no es válida',
          warningExpiredCard: 'Elige otro método de pago',
          confirmDeleteMethodTitle: '¿Eliminar esta tarjeta?',
          deleteMainText: 'Eliminar tarjeta',
          confirmDeleteMethodAccept: 'Sí, eliminar ahora',
          confirmDeleteMethodCancel: 'No, mantener tarjeta',
          confirmDeleteMethod: 'Una vez eliminada, no podrás recuperar esta tarjeta.',
        },
      },
    },
  },
  BillingPattern: {
    props: {
      title: 'Datos de facturación',
    },
    translations: {
      es: {
        title: 'Dirección asociada a la tarjeta',
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
        title: 'Detalle de la compra',
      },
    },
  },
};
