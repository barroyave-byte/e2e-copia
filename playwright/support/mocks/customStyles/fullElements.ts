import { customStyleForSplitPayment } from '@support/mocks/customStyleForSplitPayment';

export const fullElementsCustomStyle = {
  ...customStyleForSplitPayment,
  theme: {
    ...customStyleForSplitPayment.theme,
    buttons: {
      borderRadius: '20px',
      height: '50px',
    },
    inputs: {
      borderRadius: '12px',
      height: '50px',
    },
  },
  BillingPattern: {
    ...customStyleForSplitPayment.BillingPattern,
    translations: {
      es: {
        ...customStyleForSplitPayment.BillingPattern.translations.es,
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
};
