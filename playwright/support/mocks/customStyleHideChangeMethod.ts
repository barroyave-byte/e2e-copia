export const customStyleHideChangeMethod = {
    nequi_push_voucher: {
      overrides: {
        MainSection: {
          alignment: 'bottom',
        },
      },
    },
    APMRedirect: {
      overrides: {
        APMRedirectButtons: {
          props: {
            hideChangeMethodButton: true,
          },
        },
      },
    },
    PhoneVerification: {
      overrides: {
        ReturnButton: {
          props: {
            hidden: true,
          },
        },
      },
    },
    theme: {
      buttons: {
        borderRadius: '20px',
      },
      colors: {
        backgroundPrimary: '#FFF',
        backgroundSecondary: 'white',
        buttonPrimaryActive: '#FFFFFF',
        buttonPrimaryFill: '#A12885',
        buttonPrimaryHover: '#A12885',
        buttonPrimaryText: '#FFFFFF',
        inputTextColor: 'purple',
        primaryTextColor: '#404046',
      },
      inputs: {
        borderRadius: '90px',
        inputMode: 'clearable',
      },
      typography: {
        primaryFontFamily: 'Roboto',
      },
    },
};
