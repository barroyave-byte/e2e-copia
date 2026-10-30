import { expect } from '@playwright/test';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { InstallmentQuantity } from '@support/interfaces/installmentsQuantity';
import { retryTransactionPaymentStatus } from '@support/utils/retries';
import { Fraud, FraudAnalysis } from '@support/http/models/order';
import {
  comparableAnalysis,
  FIELDS_NOT_COMPARABLE_ACROSS_SOURCES,
  FRAUD_ANALYSIS_FIELDS,
  FraudAnalysisField,
  FraudExpectation,
  isPopulated,
} from './fraudAnalysis';

export default class GlobalAssert {
  async assertTransactionPaymentStatus(
    paymentStatus: OrderStatusTypes,
    privateKey: string,
    orderToken: string
  ) {
    await retryTransactionPaymentStatus(paymentStatus, privateKey, orderToken);
  }

  async assertExternalTransactionIdExists(privateKey: string, orderToken: string) {
    const orderData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
    const externalTransactionId = orderData.orderPayment.data.external_transaction_id;
    console.log(`[INFO] ----> External Transaction ID: ${externalTransactionId}`);
    expect(externalTransactionId).toBeTruthy();
  }

  async assertInstallmentsQuantity(
    quantityInstallments: InstallmentQuantity,
    privateKey: string,
    orderToken: string
  ) {
    const orderData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
    console.log(`[INFO] ----> Quantity of installments: ${quantityInstallments}`);
    expect(orderData.installments).toBe(Number(quantityInstallments));
  }

  async assertInstallmentesType(typeInstallment: string, privateKey: string, orderToken: string) {
    const orderData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
    console.log(`[INFO] ----> Type of installments: ${typeInstallment}`);
    expect(orderData.installmentsType).toBe(typeInstallment);
  }

  /**
   * Asserts the antifraud object is present and structurally complete, then applies
   * `expected`. The platform exposes the same object in the immediate purchase response and
   * in GET Order, so `source` names which one is being checked — without it a mismatch reads
   * identically for both.
   *
   * Returns the analysis so the caller can compare it against the other source later.
   */
  assertFraudAnalysis(
    source: string,
    fraud: Fraud | null | undefined,
    expected: FraudExpectation = {}
  ): FraudAnalysis {
    expect(
      fraud,
      `The ${source} carries no "fraud" object — this is the regression the test guards against.`
    ).toBeTruthy();

    const analysis = fraud?.analysis;
    expect(
      analysis,
      `The ${source} has a "fraud" object without an "analysis": ${JSON.stringify(fraud)}`
    ).toBeTruthy();

    const presentFields = Object.keys(analysis as object);
    const missingFields = FRAUD_ANALYSIS_FIELDS.filter((field) => !presentFields.includes(field));
    expect(
      missingFields,
      `The ${source} fraud analysis is missing fields. Got: ${JSON.stringify(analysis)}`
    ).toEqual([]);

    for (const field of expected.populatedFields ?? []) {
      expect(
        isPopulated((analysis as FraudAnalysis)[field]),
        `The "${field}" field is empty in the ${source} fraud analysis: ${JSON.stringify(analysis)}`
      ).toBe(true);
    }

    this.assertExpectedFraudValues(source, fraud as Fraud, analysis as FraudAnalysis, expected);

    console.log(`[INFO] ----> ${source} fraud analysis: ${JSON.stringify(analysis)}`);
    return analysis as FraudAnalysis;
  }

  /**
   * Asserts two analyses of the same order agree, ignoring the fields the platform is known
   * to report differently per source.
   */
  assertFraudAnalysisMatches(
    source: string,
    actual: FraudAnalysis,
    expected: FraudAnalysis,
    ignoredFields: readonly FraudAnalysisField[] = FIELDS_NOT_COMPARABLE_ACROSS_SOURCES
  ): void {
    expect(
      comparableAnalysis(actual, ignoredFields),
      `The ${source} fraud analysis does not match the one already asserted (ignoring ${ignoredFields.join(', ')}).`
    ).toEqual(comparableAnalysis(expected, ignoredFields));
  }

  private assertExpectedFraudValues(
    source: string,
    fraud: Fraud,
    analysis: FraudAnalysis,
    expected: FraudExpectation
  ): void {
    if (expected.processor !== undefined) {
      expect(analysis.processor, `Unexpected fraud processor in the ${source}`).toBe(
        expected.processor
      );
    }
    if (expected.riskLevel !== undefined) {
      expect(analysis.risk_level, `Unexpected risk level in the ${source}`).toBe(
        expected.riskLevel
      );
    }
    if (expected.fraudDecision !== undefined) {
      expect(analysis.fraud_decision, `Unexpected fraud decision in the ${source}`).toBe(
        expected.fraudDecision
      );
    }
    if (expected.processorResponse !== undefined) {
      expect(analysis.processor_response, `Unexpected processor response in the ${source}`).toBe(
        expected.processorResponse
      );
    }
    if (expected.detailsContains !== undefined) {
      expect(String(analysis.details), `Unexpected details message in the ${source}`).toContain(
        expected.detailsContains
      );
    }
    if (expected.fraudProcessStatus !== undefined) {
      expect(fraud.status, `Unexpected fraud process status in the ${source}`).toBe(
        expected.fraudProcessStatus
      );
    }
  }
}
