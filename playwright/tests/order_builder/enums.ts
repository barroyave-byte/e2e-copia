export enum OrderCurrency {
  MXN = 'MXN',
  USD = 'USD',
  BRL = 'BRL',
}

export function getSymbol(params: OrderCurrency): string {
  switch (params) {
    case OrderCurrency.MXN:
      return '$';
    case OrderCurrency.USD:
      return '$';
    case OrderCurrency.BRL:
      return 'R$';
    default:
      return '$';
  }
}

export enum OrderType {
  AIRLINE_ORDER = 'AIRLINE_ORDER',
  DEUNA_NOW = 'DEUNA_NOW',
  DEUNA_CHECKOUT = 'DEUNA_CHECKOUT',
}
