import { RuleCondition } from '@pages/admin/rules/ruleCondition';
import { BankCondition } from '@pages/admin/rules/conditions/bankCondition';
import { RuleConditions } from '@support/interfaces/ruleConditions';
import { CardTypeCondition } from './conditions/cardTypeCondition';
import { BinCondition } from '@pages/admin/rules/conditions/binCondition';
import { StoreListCondition } from '@pages/admin/rules/conditions/storeListCondition';
import { VerticalCondition } from '@pages/admin/rules/conditions/verticalCondition';

export class ConditionFactory {
  static getConditionStrategy(condition: RuleConditions): RuleCondition {
    switch (condition) {
      case RuleConditions.Bank:
        return new BankCondition();
      case RuleConditions.CardType:
        return new CardTypeCondition();
      case RuleConditions.Bin:
        return new BinCondition();
      case RuleConditions.StoreList:
        return new StoreListCondition();
      case RuleConditions.Vertical:
        return new VerticalCondition();
      // Agregar más casos para otras condiciones.
      default:
        throw new Error(`Unknown condition: ${condition}`);
    }
  }
}
