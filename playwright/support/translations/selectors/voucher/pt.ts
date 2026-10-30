import { VoucherTranslations } from './voucherTranslations';

export const screenBazReferenceProcessor: VoucherTranslations['screenBazReferenceProcessor'] = {
  title: 'Pague em qualquer Banco Azteca',
  description: 'Dirija-se à agência mais próxima e informe que fará um pagamento de serviço.',
  referenceTitle: 'REFERÊNCIA DE PAGAMENTO',
};

export const screenOxxoReferenceProcessor: VoucherTranslations['screenOxxoReferenceProcessor'] = {
  title: 'Conclua seu pagamento em qualquer OXXO',
  description:
    'Mostre o código de barras ao caixa do OXXO para escanear e verificar as informações.',
  referenceTitle: 'REFERÊNCIA DE PAGAMENTO',
};

export const screenPixProcessor: VoucherTranslations['screenPixProcessor'] = {
  title: 'Complete seu pagamento',
  description:
    'Abra o aplicativo do seu banco, selecione a opção Pix e escaneie ou copie o código QR para concluir o pagamento.',
  referenceTitle: 'CÓDIGO QR E CÓDIGO PIX',
  referenceTitleForQR: 'CÓDIGO QR',
  waitingConfirmationTitle: 'Aguardando confirmação no App',
  cancelConfirmationTitle: 'Alterar método de pagamento',
  cancelConfirmationDescription:
    'Se você pagar com o QR do PIX, a compra será concluída mesmo que altere o método de pagamento.',
  cancelConfirmationButton: 'Alterar método',
  expirationText: 'Expirado',
  copyReferenceText: 'Conteúdo copiado',
};

export const screenFemsaOxxoCash: VoucherTranslations['screenFemsaOxxoCash'] = {
  title: 'Conclua seu pagamento em qualquer OXXO',
  description:
    'Mostre o código de barras ao caixa do OXXO para escanear e verificar as informações.',
  referenceTitle: 'REFERÊNCIA DE PAGAMENTO',
  additionalInfoDisclaimer: 'Guarde o comprovante de pagamento caso precise de algum suporte.',
};

export const screenNequiPush: VoucherTranslations['screenNequiPush'] = {
  sentConfirmationText: 'A NEQUI enviará uma notificação para:',
};
