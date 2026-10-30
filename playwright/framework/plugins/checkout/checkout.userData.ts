import { Context, FrameworkPlugin } from '../interface';
import { GuestUserDataPage } from '@pages/checkout/user_data/guestUserDataPage';
import { ShippingDataPage } from '@pages/checkout/shipping_data/shippingDataPage';
import { BaseUserData } from '@support/interfaces/user_data';
import { BaseUserAddress } from '@support/interfaces/address_user';

export interface FillShippingAddressParams {
  userAddress: BaseUserAddress;
  opts?: { withApartment?: boolean; withCity?: boolean };
}

export class PluginCheckoutUserData extends FrameworkPlugin {
  pluginBaseName = 'checkout.userData';

  guestUserDataPage!: GuestUserDataPage;
  shippingDataPage!: ShippingDataPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.guestUserDataPage = new GuestUserDataPage(context.page);
    this.shippingDataPage = new ShippingDataPage(context.page);
  }

  /** @description Fills the guest user data form (name, last name, phone, document identity) and clicks Continue, waiting for the register API response. */
  async $tf_fillGuestUserData(userData: BaseUserData) {
    await this.guestUserDataPage.enterGuestUserDataAndContinue(userData);
  }

  /** @description Searches for a shipping address, selects it from results, confirms it, and clicks Continue. Supports optional apartment and city fields. */
  async $tf_fillShippingAddress({ userAddress, opts }: FillShippingAddressParams) {
    if (opts?.withApartment || opts?.withCity) {
      await this.shippingDataPage.searchAddressAndCompleteInformation(userAddress);
    } else {
      await this.shippingDataPage.searchAddressAndSelectAndContinue(userAddress);
    }
  }

  async $tf_selectAddressViaGeolocation() {
    '@description: Opens the change-address flow and clicks "Use my location" to resolve the shipping address through the browser Geolocation API, confirms it, and clicks Continue. The test must grant the `geolocation` permission and call `context.setGeolocation(...)` before running this step, otherwise the browser will never resolve a position.';
    await this.shippingDataPage.selectAddressUsingMyLocation();
  }
}
