export const normalizeAmountValue = (value: string): string => {
  return parseFloat(value).toFixed(2);
};
