export interface MercadoPagoWalletCardDetails {
  number: string;
  holder: string;
  expiration: string;
  cvv: string;
}

const MPWalletVisaCreditCardSuccessful: MercadoPagoWalletCardDetails = {
  number: '4075595716483764',
  holder: 'APRO',
  expiration: '1130',
  cvv: '123',
};

const MPWalletVisaCreditCardFailed: MercadoPagoWalletCardDetails = {
  number: '4075595716483764',
  holder: 'CTNA',
  expiration: '1130',
  cvv: '123',
};

const getMPCreditCard = (card?: Partial<MercadoPagoWalletCardDetails>): MercadoPagoWalletCardDetails => ({
  number: '4075595716483764',
  holder: 'CTNA',
  expiration: '1130',
  cvv: '123',
  ...card
})

const MPWalletVisaDebitCardSuccessful: MercadoPagoWalletCardDetails = {
  number: '4189141221267633',
  holder: 'APRO',
  expiration: '1130',
  cvv: '123',
};

const MPWalletVisaDebitCardProcessing: MercadoPagoWalletCardDetails = {
  number: '4189141221267633',
  holder: 'CONT',
  expiration: '1130',
  cvv: '123',
};

export {
  MPWalletVisaCreditCardSuccessful,
  MPWalletVisaDebitCardSuccessful,
  MPWalletVisaDebitCardProcessing,
  MPWalletVisaCreditCardFailed,
  getMPCreditCard
};
