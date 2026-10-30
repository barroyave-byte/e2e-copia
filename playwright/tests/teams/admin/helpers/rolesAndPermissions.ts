import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';

export interface Merchant {
  id: string;
  name: string;
}

export type MerchantList = Merchant[];

// Standard size for the dynamic network fixture created per spec file. 3
// covers every roles_and_permissions scenario observed (max explicit
// selection is "all three merchants" -- see ADM-T542/T556-558/T761/T762/
// RECON-T18); role/user "network access" is always granted over the merchants
// actually created, not a fixed historical count, so this only needs to be
// >= the largest UI selection any spec performs.
export const DEFAULT_NETWORK_MERCHANT_COUNT = 3;

export interface NetworkFixture {
  networkId: string;
  networkName: string;
  merchants: MerchantList;
  ownerMerchantToken: string;
}

export async function createNetworkFixture(
  configMerchant: ConfigMerchant,
  merchantCount: number = DEFAULT_NETWORK_MERCHANT_COUNT,
  country: CountryCodes = 'MX'
): Promise<NetworkFixture> {
  const owner = await configMerchant.basicSetup(country);
  const { networkId, networkName } = await apiCallNewman.createNetwork(
    owner.merchantId,
    owner.merchantToken
  );

  const merchants: MerchantList = [{ id: owner.merchantId, name: owner.merchantName }];

  for (let i = 1; i < merchantCount; i++) {
    const member = await configMerchant.basicSetup(country);
    await apiCallNewman.addMerchantToNetwork(networkId, member.merchantId, owner.merchantToken);
    merchants.push({ id: member.merchantId, name: member.merchantName });
  }

  return {
    networkId,
    networkName,
    merchants,
    ownerMerchantToken: owner.merchantToken,
  };
}

export const selectMerchants = (merchantList: MerchantList, count: number): MerchantList => {
  return merchantList.slice(0, count);
};

export const getMerchantNames = (merchantList: MerchantList): string[] => {
  return merchantList.map((merchant) => merchant.name);
};

export const getMerchantIds = (merchantList: MerchantList): string[] => {
  return merchantList.map((merchant) => merchant.id);
};

export const getRemainingMerchants = (
  allMerchants: MerchantList,
  selectedMerchants: MerchantList
): MerchantList => {
  const selectedIds = new Set(selectedMerchants.map((m) => m.id));
  return allMerchants.filter((merchant) => !selectedIds.has(merchant.id));
};
