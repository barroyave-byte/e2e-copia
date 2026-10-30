import { CheckoutModule } from '@support/interfaces/checkoutModuleType';

export const defaultCheckoutModulesWithoutLogin: CheckoutModule[] = [
  {
    name: 'UserInfoPattern',
  },
  {
    name: 'OrderDetailPattern',
  },
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: true,
      fields: [
        {
          name: 'country',
          validation: {
            required: false,
          },
        },
        {
          name: 'zipcode',
          validation: {
            required: true,
          },
        },
      ],
    },
  },
];


export const defaultCheckoutModules: CheckoutModule[] = [
  {
    name: 'LoginWithEmailOrderPattern',
  },
  {
    name: 'UserInfoPattern',
  },
  {
    name: 'OrderDetailPattern',
  },
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: true,
      fields: [
        {
          name: 'country',
          validation: {
            required: false,
          },
        },
        {
          name: 'zipcode',
          validation: {
            required: true,
          },
        },
      ],
    },
  },
];


export const paymentLinkCheckoutModules: CheckoutModule[] = [
  {
    name: 'LoginPattern',
  },
  {
    name: 'UserInfoPattern',
  },
  {
    name: 'OrderDetailPattern',
  },
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: true,
      fields: [
        {
          name: 'country',
          validation: {
            required: false,
          },
        },
        {
          name: 'zipcode',
          validation: {
            required: true,
          },
        },
        {
          name: "address1",
          validation: {
           required: true
          }
        }
      ],
    },
  },
];
