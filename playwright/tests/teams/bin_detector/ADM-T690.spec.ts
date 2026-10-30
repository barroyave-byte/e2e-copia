import { test, expect } from '@support/fixtures';

let privateKey: string;
let merchantId: string;
let merchantName: string;

test.describe('@regression Bin Detector API Tests', () => {
  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('NO_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  // @ZEBRUNNER_TESTRAIL_TESTCASE=ADM-T690
  test(
    '@ADM-T690 - Should return valid bin information for a known card',
    { tag: ['@team_payment_integration'] },
    async ({ paymentService }) => {
      const testBin = '411111';
      const response = await paymentService.getBinInfo(testBin, privateKey);
      expect(response.status).toBe(200);
    }
  );
});
