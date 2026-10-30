import { WidgetOptionsExplore } from '@support/interfaces/experienceTypesExplore';

export class BasePageOpenWidget {
  constructor(
    protected page,
    protected type?: string
  ) {}

  async navigateAndSetup(_?: WidgetOptionsExplore) {
    throw new Error("Method 'navigateAndSetup()' must be implemented.");
  }
}
