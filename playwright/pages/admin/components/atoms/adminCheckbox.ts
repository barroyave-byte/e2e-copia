import { type Locator } from '@playwright/test';

import { AdminAtomAbstract } from './adminAtomAbstract';

export class AdminCheckboxButton extends AdminAtomAbstract {
  isChecked(checkbox: Locator): Promise<boolean> {
    const button = checkbox.locator('button[aria-checked="true"]');
    return button.isVisible();
  }
}
