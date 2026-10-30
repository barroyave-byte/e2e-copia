import { expect, type Locator } from '@playwright/test';

import { AdminAtomAbstract } from './adminAtomAbstract';

export class AdminRadioButton extends AdminAtomAbstract {
  async check(radioButton: Locator): Promise<void> {
    await expect(radioButton).toBeAttached();
    const internalInput = radioButton.locator('input[type="radio"]');
    await expect(internalInput).toBeAttached();
    if (!(await internalInput.isChecked())) {
      await radioButton.click();
    }
    await expect(internalInput).toBeChecked();
  }

  isChecked(radioButton: Locator): Promise<boolean> {
    const internalInput = radioButton.locator('input[type="radio"]');
    return internalInput.isChecked();
  }
}
