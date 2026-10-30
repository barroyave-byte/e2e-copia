export interface IInitParams {
  withInstallments?: boolean;
  withAditionalProcessor?: boolean;
}

export interface ITokenizeOrderParams {
  currency?: string;
  userEmail: string;
}
