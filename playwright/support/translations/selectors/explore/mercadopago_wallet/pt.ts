import { MercadoPagoWalletTranslations } from './mercadoPagoWallet';

export const screenMercadoPagoWalletProcessor: MercadoPagoWalletTranslations['screenMercadoPagoWalletProcessor'] =
  {
    labelRedirectingToSite: 'Redirecionando para o site.',
    labelWithMercadoPagoAccount: 'Com sua conta do Mercado Pago',
    labelWithoutMercadoPagoAccount: 'Sem conta do Mercado Pago',
    labelLoginWithAccount: 'Entrar com minha conta',
  };

export const screenMercadoPagoWalletPaymentMethod: MercadoPagoWalletTranslations['screenMercadoPagoWalletPaymentMethod'] =
  {
    titleHowToPay: 'Como você quer pagar?',
    labelCreditCard: 'Cartão de crédito',
    labelDebitCard: 'Cartão de débito',
    labelAccountBalance: 'Dinheiro na conta do Mercado Pago',
    labelBankTransfer: 'Transferência SPEI',
    buttonChangePaymentMethod: 'Pagar com outro medio',
    buttonChooseAnotherPaymentMethod: 'Escolher outro medio de pagamento',
    labelBNPL: 'Meses sem cartão',
    labelEfecty: 'Efectivo',
    labelBBVA: 'BBVA',
  };

export const screenCardForm: MercadoPagoWalletTranslations['screenCardForm'] = {
  title: 'Preencha os dados do seu cartão',
};

export const screenMercadoPagoPaymentReview: MercadoPagoWalletTranslations['screenMercadoPagoPaymentReview'] =
  {
    labelCheckYourPayment: 'Revise seu pagamento',
    labelPaymentMethod: 'Meio de pagamento',
  };

export const screenMercadoPagoThankYouPage: MercadoPagoWalletTranslations['screenMercadoPagoThankYouPage'] =
  {
    labelPaymentSuccessful: 'Pronto! Seu pagamento foi aprovado',
    labelPaymentProcessing: 'Estamos processando seu pagamento',
    labelPaymentFailed: 'Não foi possível processar o seu pagamento',
    labelPaymentRejection: 'Por motivos de segurança, seu pagamento foi recusado',
    labelFinalizePayment: 'Agora apenas precisa finalizar o pagamento',
    buttonAcknowledge: 'Ok, entendido',
    labelBBVAInstruction:
      'Diga ao caixa que deseja pagar um serviço do Mercado Pago e forneça esses dados:',
  };

export const screenLogin: MercadoPagoWalletTranslations['screenLogin'] = {
  labelCompleteThisField: 'Preencha este campo.',
};
