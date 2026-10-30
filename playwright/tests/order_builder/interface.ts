import { BaseCreditCard } from '@support/interfaces/credit_cards';
import { OrderCurrency, OrderType } from './enums';
import { MethodType } from '@support/http/models/payment';

export interface OrderConfig {
  order_type: OrderType;
  order_currency: OrderCurrency;
  email: string;
  method_type?: MethodType;
  creditCard?: BaseCreditCard | Partial<BaseCreditCard>;
  cardId?: string;
  order_token?: string;
  removeCardInfo?: boolean;
  country_code?: string;
}
