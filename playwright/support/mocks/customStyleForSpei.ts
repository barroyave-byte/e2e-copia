export const customStyleForSpei = {
  theme: {
    colors: {
      primaryTextColor: '#5a51be',
      backgroundSecondary: '#FFFFFF',
      backgroundPrimary: '#e8e1fd',
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
  SpeiPattern: {
    translations: {
      es: {
        spei: {
          title: 'Título theme',
          description: 'Description',
          bullets: 'Bullet 1 \n Bullet 2',
        },
      },
    },
  },
  VoucherPage: {
    translations: {
      es: {
        header: {
          title: {
            spei_opm: 'Título theme',
          },
          subtitle: 'Subtitle',
        },
        body: {
          description: {
            spei_opm: 'Copia la CLABE y accede a tu banca en línea',
          },
          referenceTitle: {
            spei_opm: 'TU NÚMERO DE CLABE',
          },
          payBefore: { spei_opm: 'Paga antes porfa' },
        },
        additionalInfoSection: {
          instructions: {
            title: 'instrucciones de pay',
            disclaimer: {
              spei_opm: 'disclaimer',
            },
            steps: {
              store: {
                spei_opm: 'Step 1',
              },
              box: {
                spei_opm: 'Step 2',
              },
              referenceNumber: {
                spei_opm: 'Step 3',
              },
              payment: {
                spei_opm: 'Step 4',
              },
              confirmation: {
                spei_opm: 'Step 5',
              },
            },
          },
        },
        footer: {
          actions: {
            download_reference: {
              spei_opm: 'Descargar referencia',
            },
            seeOrderSummary: 'Ver resumen',
          },
        },
      },
    },
  },
};
