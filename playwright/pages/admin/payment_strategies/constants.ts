export const STRATEGY_SELECTORS = {
  // The processor-select listbox option wraps its label in a "payment-selector-option-label-*"
  // testid (both the payment and antifraud groups); the option's own testid embeds an opaque
  // id/index instead of the processor name, so the label is the only name-addressable target.
  STRATEGY_PROCESSOR_ITEM: (processor: string) =>
    `payment-selector-option-label-${processor.toLowerCase().replaceAll(' ', '-')}`,
  OPERATOR_EQUAL: 'specific-rule-email-and-stores-operator-select-option-eq',
  OPERATOR_OPTION: (condition: string) =>
    `specific-rule-email-and-stores-operator-select-option-${condition}`,
} as const;
