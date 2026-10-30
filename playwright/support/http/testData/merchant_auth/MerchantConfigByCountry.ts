import { CountryCodes } from "@support/interfaces/countryCodeTypes";
import { MerchantRequest } from "../../models/merchantAuth";

/**
 * Country-specific merchant configuration
 * Replaces the Postman pre-request script logic
 */
export class MerchantConfigByCountry {
  private static readonly COUNTRY_CONFIGS: Record<CountryCodes, Omit<MerchantRequest, 'name' | 'managed_by_deuna'>> = {
    MX: {
      country: 'MX',
      city: 'CDMX',
      short_name: 'AUTO',
      timezone: 'America/Mexico_City',
      currency: 'MXN'
    },
    ES: {
      country: 'ES',
      city: 'Madrid',
      short_name: 'AUTO',
      timezone: 'Europe/Madrid',
      currency: 'EUR'
    },
    BR: {
      country: 'BR',
      city: 'Rio de Janeiro',
      short_name: 'AUTO',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL'
    },
    CL: {
      country: 'CL',
      city: 'Santiago de Chile',
      short_name: 'AUTO',
      timezone: 'America/Santiago',
      currency: 'CLP'
    },
    CO: {
      country: 'CO',
      city: 'Bogota',
      short_name: 'AUTO',
      timezone: 'America/Bogota',
      currency: 'COP'
    },
    EC: {
      country: 'EC',
      city: 'Quito',
      short_name: 'AUTO',
      timezone: 'America/Guayaquil',
      currency: 'USD'
    },
    GT: {
      country: 'GT',
      city: 'Guatemala',
      short_name: 'AUTO',
      timezone: 'America/Guatemala',
      currency: 'GTQ'
    },
    PE: {
      country: 'PE',
      city: 'Lima',
      short_name: 'AUTO',
      timezone: 'America/Lima',
      currency: 'PEN'
    },
    HN: {
      country: 'HN',
      city: 'Tegucigalpa',
      short_name: 'AUTO',
      timezone: 'America/Tegucigalpa',
      currency: 'HNL'
    },
    CR: {
      country: 'CR',
      city: 'San Jose',
      short_name: 'AUTO',
      timezone: 'America/Costa_Rica',
      currency: 'CRC'
    },
    US: {
      country: 'US',
      city: 'New York',
      short_name: 'AUTO',
      timezone: 'America/New_York',
      currency: 'USD'
    },
    UY: {
      country: 'UY',
      city: 'Montevideo',
      short_name: 'AUTO',
      timezone: 'America/Montevideo',
      currency: 'UYU'
    },
    AR: {
      country: 'AR',
      city: 'Cordoba',
      short_name: 'AUTO',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS'
    }
  };

  /**
   * Generates a random number for merchant naming (same logic as Postman)
   */
  private static generateRandomNumber(): number {
    return Math.floor(10000 + Math.random() * 9000000);
  }

  /**
   * Creates a complete merchant request for the specified country
   * @param country - Country code
   * @param customName - Optional custom name (if not provided, uses AUTO_MERCHANT_{COUNTRY})
   * @param managedByDuna - Whether merchant is managed by DUNA (default: false)
   * @returns Complete MerchantRequest object
   */
  static createMerchantRequest(
    country: CountryCodes, 
    customName?: string, 
    managedByDuna: boolean = false
  ): MerchantRequest {
    const config = this.COUNTRY_CONFIGS[country];
    
    if (!config) {
      throw new Error(`Unsupported country code: ${country}. Supported countries: ${Object.keys(this.COUNTRY_CONFIGS).join(', ')}`);
    }

    const randomNumber = this.generateRandomNumber();
    const merchantName = customName || `AUTO_MERCHANT_${country} ${randomNumber}`;

    return {
      ...config,
      name: merchantName,
      managed_by_deuna: managedByDuna
    };
  }
}
