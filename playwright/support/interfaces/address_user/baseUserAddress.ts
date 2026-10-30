import { Locator } from '@playwright/test';

export interface BaseUserAddress {
  address: string;
  apartament?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface BillingUserAddress {
  firstName?: string;
  lastName?: string;
  email?: string;
  zipcode?: string;
  phone?: string;
  identityDocument?: string;
}

export interface BillingFormMap {
  locator: Locator;
  value?: string;
}
