import { ServiceFactory, SERVICE_KEYS } from '@support/http';

export default class ConfigAuth {
  async setUserToken(userEmail: string, merchantId: string, privateKey: string): Promise<string> {
    const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
    const userTokenAuth = await userAuthService.loginUserTypeSms(
      userEmail,
      '010101',
      merchantId,
      privateKey
    );
    return userTokenAuth.token;
  }
}
