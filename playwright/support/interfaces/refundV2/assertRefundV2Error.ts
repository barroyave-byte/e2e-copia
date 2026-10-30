import { expect } from '@playwright/test';
import { BaseValidationRefundV2 } from './baseValidationRefundV2';

export function assertRefundV2Error(
  response: { status: number; data?: any },
  expected: BaseValidationRefundV2
): void {
  expect(response.status).toBe(expected.statusCode);
  expect(response.data?.error?.code).toBe(expected.errorCode);
  expect(response.data?.error?.description).toBe(expected.errorDescription);
}
