/**
 * Utility class for payment calculations
 * Contains methods for calculating payment amounts with interest for different scenarios
 */
export class PaymentCalculator {
  /**
   * Calculates the total payment amount with interest for installment payments
   *
   * @param totalAmount - The base amount without interest
   * @param installmentRate - The interest rate (percentage) for the installments
   * @param installments - The number of installments
   * @returns The total payment amount including interest
   */
  static calculateTotalPaymentWithInterest(
    totalAmount: number,
    installmentRate: number | string,
    installments: number | string
  ): number {
    // Convert parameters to numbers if they are strings
    const rate = typeof installmentRate === 'string' ? Number(installmentRate) : installmentRate;
    const installmentsCount =
      typeof installments === 'string' ? Number(installments) : installments;

    return totalAmount * (1 + (rate / 100) * installmentsCount);
  }

  /**
   * Calculates the installment amount (amount per payment)
   *
   * @param totalAmount - The base amount without interest
   * @param installmentRate - The interest rate (percentage) for the installments
   * @param installments - The number of installments
   * @param removeDecimalDigits - Whether to remove the last 2 digits (decimal part)
   * @returns The amount per installment
   */
  static calculateInstallmentAmount(
    totalAmount: number,
    installmentRate: number | string,
    installments: number | string,
    removeDecimalDigits: boolean = true
  ): number {
    // Calculate total payment first
    const totalPayment = this.calculateTotalPaymentWithInterest(
      totalAmount,
      installmentRate,
      installments
    );

    // Convert installments to number if it's a string
    const installmentsCount =
      typeof installments === 'string' ? Number(installments) : installments;

    let result = totalPayment / installmentsCount;

    if (removeDecimalDigits) {
      result = Math.floor(result / 100);
    }

    return result;
  }
}
