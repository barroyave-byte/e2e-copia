import { AvailableForms } from '@support/interfaces/checkoutTesterInterface';
import { ExperienceTypesExplore } from '@support/interfaces/experienceTypesExplore';

export const typeMapping: Record<AvailableForms, ExperienceTypesExplore> = {
  'Abrir DEUNA Now': 'Payment Widget',
  'Abrir Checkout': 'Checkout Widget',
  'Apple Pay': 'Payment vault (modal)',
  Daviplata: 'Payment Link',
  'Nequi Push': 'Payment Link',
  'Nequi QR': 'Payment Link',
  PSE: 'Payment Link',
  Paypal: 'Payment Link',
  SpeiConekta: 'Payment Link',
  WebPay: 'Payment Link',
  Vault: 'Payment vault (modal)',
};
