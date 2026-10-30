import { CommonsActions } from '@pages/commonActions';
import { type Page } from '@playwright/test';

export abstract class AdminAtomAbstract extends CommonsActions {
  constructor(page: Page) {
    super(page);
  }

  // TODO: Add common actions for admin atoms
}
