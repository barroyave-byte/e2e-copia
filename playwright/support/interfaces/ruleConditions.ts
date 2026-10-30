export enum RuleConditions {
  Bank = 'bank',
  CardType = 'cardType',
  Bin = 'bin',
  StoreList = 'storeList',
  Vertical = 'vertical',
}

interface BinConditionData {
  binCode: string;
}

export type StoreListConditionData = {
  storeListName: string;
  condition: string;
  stores: string;
};

export type VerticalConditionData = {
  vertical: string;
  condition: string;
};

export type ConditionDataMap = {
  [RuleConditions.Bank]: Banks;
  [RuleConditions.CardType]: CardTypes;
  [RuleConditions.Bin]: BinConditionData;
  [RuleConditions.StoreList]: StoreListConditionData;
  [RuleConditions.Vertical]: VerticalConditionData;
};

export enum Banks {
  ABBEY_NATIONAL_PLC = 'ABBEY NATIONAL PLC',
}

export enum CardTypes {
  Credit = 'credit_card',
  Debit = 'debit_card',
}
