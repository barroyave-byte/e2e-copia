import { Request, Response } from '@playwright/test';

export interface PurchaseResponseValidator {
  validatePayload(request: Request): Promise<void> | void;
  validateResponse(responseJson: any, response?: Response): Promise<void> | void;
}
