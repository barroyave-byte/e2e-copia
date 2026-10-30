// Separate Enums for different Statsig projects
export enum FraudFlagNames {
  ShouldFinishFlowByPaymentType = 'should-finish-flow-by-payment-type',
  ShouldLoginWithSift = 'should-login-with-sift',
}

export enum PaymentsFlagNames {
  ShouldUseMultiCaptureWithLock = 'use-multi-capture-with-lock',
}

// Original Enum for compatibility
export enum FlagNames {
  ShouldFinishFlowByPaymentType = 'should-finish-flow-by-payment-type',
  ShouldLoginWithSift = 'should-login-with-sift',
  ShouldUseMultiCaptureWithLock = 'use-multi-capture-with-lock',
  ReconciliationsMerchants = 'reconciliations_merchants',
  ShouldHandleCvvRequired = 'handle-cvv-required',
  ShouldReturnUnknownCards = 'enable-unknown-card-brand-response',
}

// Mapping of flags to projects
export const PROJECT_MAPPING = {
  [FlagNames.ReconciliationsMerchants]: 'admin',
  [FlagNames.ShouldFinishFlowByPaymentType]: 'fraud',
  [FlagNames.ShouldLoginWithSift]: 'fraud',
  [FlagNames.ShouldUseMultiCaptureWithLock]: 'payments',
  [FlagNames.ShouldHandleCvvRequired]: 'payments',
  [FlagNames.ShouldReturnUnknownCards]: 'payments',
} as const;

export type ProjectType = 'fraud' | 'payments';

export enum RuleNames {
  MerchantsThatDontEvaluateCashOrders = 'merchants-that-dont-evaluate-cash-orders',
  MerchantsThatDontEvaluateCashOrdersTests = 'merchants-that-dont-evaluate-cash-orders-test',
  MerchantsThatUseMultiCaptureWithLockNotCompleteAmountTests = 'merchants-that-use-multi-capture-with-lock-not-complete-amount-test',
  MerchantsThatUseMultiCaptureWithLockCompleteAmountTests = 'merchants-that-use-multi-capture-with-lock-complete-amount-test',
  MerchantsThatRequireCVVOnPurchaseTests = 'merchants-that-require-cvv-on-purchase-test',
  MerchantsThatDontRequireCVVOnPurchaseTests = 'merchants-that-dont-require-cvv-on-purchase-test',
  MerchantsReturnUnknownCards = 'merchants-return-unknown-cards',
}

export enum PaymentType {
  Cash = '$cash',
  DebitCard = '$debit_card',
  CreditCard = '$credit_card',
}
