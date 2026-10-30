import { VoucherTranslations } from './voucherTranslations';

export const screenBazReferenceProcessor: VoucherTranslations['screenBazReferenceProcessor'] = {
  title: 'Paga en cualquier Banco Azteca',
  description: 'Dirígete a la sucursal más cercana e informa que realizarás un pago de servicio.',
  referenceTitle: 'REFERENCIA DE PAGO',
};

export const screenOxxoReferenceProcessor: VoucherTranslations['screenOxxoReferenceProcessor'] = {
  title: 'Completa tu pago en cualquier OXXO',
  description:
    'Muestra el código de barras al cajero de OXXO para escanear y verifica la información',
  referenceTitle: 'REFERENCIA DE PAGO',
};

export const screenPixProcessor: VoucherTranslations['screenPixProcessor'] = {
  title: 'Completa tu pago',
  description:
    'Abre la aplicación de tu banco, selecciona la opción Pix y escanea o copia el código QR para completar el pago.',
  referenceTitle: 'CÓDIGO QR Y CÓDIGO PIX',
  referenceTitleForQR: 'CÓDIGO QR',
  waitingConfirmationTitle: 'Esperando confirmación en la app',
  cancelConfirmationTitle: 'Cambiar método de pago',
  cancelConfirmationDescription:
    'Si pagas con el QR de PIX, la compra se completará incluso si cambias el método de pago.',
  cancelConfirmationButton: 'Cambiar método',
  expirationText: 'Expirado',
  copyReferenceText: 'Contenido copiado',
};

export const screenFemsaOxxoCash: VoucherTranslations['screenFemsaOxxoCash'] = {
  title: 'Completa tu pago en cualquier OXXO',
  description:
    'Muestra el código de barras al cajero de OXXO para escanear y verifica la información',
  referenceTitle: 'REFERENCIA DE PAGO',
  additionalInfoDisclaimer: 'Conserva el comprobante de pago en caso de requerir algún soporte.',
};

export const screenNequiPush: VoucherTranslations['screenNequiPush'] = {
  sentConfirmationText: 'NEQUI enviará una notificación a:',
};
