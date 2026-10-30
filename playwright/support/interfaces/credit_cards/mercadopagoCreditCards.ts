import { BaseCreditCard } from './baseCreditCard';

const mercadopagoMasterCardSuccessful: BaseCreditCard = {
  number: '5031755734530604',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'CLEAR APRO',
  document_number: '123456789',
};

const mercadopagoMasterCardInstallments: BaseCreditCard = {
  number: '4075595716483764',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'CLEAR APRO',
  document_number: '123456789',
};

const mercadopagoVisaInstallments: BaseCreditCard = {
  number: '4009175332806176',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'CLEAR APRO',
  document_number: '123456789',
};

// https://www.mercadopago.com.mx/developers/en/docs/your-integrations/test/cards
const mercadopagoMasterCardSuccessfulMX: BaseCreditCard = {
  number: '5474925432670366',
  expiration_date: '1130',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '123456789',
};

const mercadopagoMasterCardSuccessfulNoClear: BaseCreditCard = {
  number: '5031755734530604',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '123456789',
};

const mercadoPagoVisaCardSuccessful: BaseCreditCard = {
  number: '4075595716483764',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '123456789',
};

const mercadoPagoVisaCardSuccessfulClear: BaseCreditCard = {
  number: '4075595716483764',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'CLEAR APRO',
  document_number: '123456789',
};

const mercadoPagoVisaCardFailed: BaseCreditCard = {
  number: '4075595716483764',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'OTHE OTHE',
  document_number: '123456789',
};

const mercadoPagoMasterCardFailed: BaseCreditCard = {
  number: '5254133674403564',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'OTHE OTHE',
  document_number: '123456789',
};

const mercadoPagoVisaCardManualReview: BaseCreditCard = {
  number: '4075595716483764',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'CONT CONT',
  document_number: '123456789',
};

const mercadopagoMasterCardSuccessfulCO: BaseCreditCard = {
  number: '5254133674403564',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'CLEAR APRO',
  document_number: '123456789',
};

const mercadopagoMasterCardSuccessfulCONoClear: BaseCreditCard = {
  number: '5254133674403564',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '123456789',
};

const mercadopagoMasterCardSuccessfulCL: BaseCreditCard = {
  number: '5416752602582580',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'CLEAR APRO',
  document_number: '123456789',
};

const mercadoPagoVisaFraud: BaseCreditCard = {
  number: '4235647728025682',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '01354778911',
};

const mercadoPagoVisaCardTokenizationSuccessful: BaseCreditCard = {
  number: '4509953566233704',
  // Later than mercadoPagoVisaCardSuccessful on purpose: saved cards are listed by
  // expiration_date, and with both on 11/27 the tie made either card come first (and get
  // preselected) at random in the split payment specs (ENTP1-T2304, T2352, T2584).
  expiration_date: '1228',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '12345678',
};

const mercadoPagoAmexCardTokenizationSuccessful: BaseCreditCard = {
  number: '371180303257522',
  expiration_date: '1127',
  cvv_code: '1234',
  cardholder_name: 'APRO APRO',
  document_number: '12345678',
};

const mercadopagoMasterCardBrasilSuccessful: BaseCreditCard = {
  number: '5031433215406351',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '51682247503',
};

const mercadopagoDebitVisaColombiaSuccessful: BaseCreditCard = {
  number: '4915112055246507',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '51682247503',
};

export {
  mercadopagoMasterCardSuccessful,
  mercadopagoMasterCardSuccessfulNoClear,
  mercadoPagoVisaCardSuccessful,
  mercadoPagoVisaCardFailed,
  mercadoPagoMasterCardFailed,
  mercadoPagoVisaCardManualReview,
  mercadopagoMasterCardSuccessfulCO,
  mercadoPagoVisaFraud,
  mercadoPagoVisaCardTokenizationSuccessful,
  mercadopagoMasterCardBrasilSuccessful,
  mercadoPagoAmexCardTokenizationSuccessful,
  mercadopagoDebitVisaColombiaSuccessful,
  mercadopagoMasterCardSuccessfulCL,
  mercadopagoMasterCardSuccessfulCONoClear,
  mercadopagoMasterCardSuccessfulMX,
  mercadoPagoVisaCardSuccessfulClear,
  mercadopagoMasterCardInstallments,
  mercadopagoVisaInstallments,
};
