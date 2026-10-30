import { BaseHttpClient } from '../BaseHttpClient';

export abstract class BaseService {
  protected httpClient: BaseHttpClient;

  constructor(httpClient: BaseHttpClient) {
    this.httpClient = httpClient;
  }
}
