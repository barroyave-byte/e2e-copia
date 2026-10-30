import { BaseCreditCard } from '@support/interfaces/credit_cards';
import { MethodType, PurchaseRequestV2 } from '@support/http/models/payment';
import {
  generatePNR,
  generateRandomNumber,
  generateTicketNumber,
} from '@tests/order_builder/order_functions';
import { log } from 'console';
import * as crypto from 'crypto';
import { EmailGenerator } from '@support/utils/EmailGenerator';

interface Address {
  additional_description: string;
  address_type: string;
  address1: string;
  address2: string;
  city: string;
  country_code: string;
  country: string;
  email: string;
  first_name: string;
  id: number;
  identity_document_type: string;
  identity_document: string;
  is_default: boolean;
  last_name: string;
  lat: number;
  lng: number;
  phone: string;
  state_code: string;
  state_name: string;
  user_id: string;
  zipcode: string;
}

function generateAddress(email: string): Address {
  return {
    additional_description: '',
    address_type: 'home',
    address1: '6201 14th Ave NW',
    address2: 'Apt 101',
    city: 'Seattle',
    country_code: 'US',
    country: 'USA',
    email: email,
    first_name: 'Juan',
    id: generateRandomNumber(8),
    identity_document_type: 'RUT',
    identity_document: 'IAOI640911TB8',
    is_default: true,
    last_name: 'Pacheco',
    lat: -41.743,
    lng: 11.987,
    phone: '+14155688537',
    state_code: '',
    state_name: 'Washington',
    user_id: crypto.randomUUID(),
    zipcode: '98107',
  };
}

/*
 * =========================== FOR PURCHASE V1 ===========================
 */

interface CardInfoV1 {
  address1: string;
  card_cvv: string;
  card_holder_dni: string;
  card_holder: string;
  card_number: string;
  city: string;
  expiry_month: string;
  expiry_year: string;
  is_single_use: boolean;
  phone: string;
  zip: string;
}

interface SecureAuthV1 {
  cavv: string;
  eci: string;
  flow_type: string;
  xid: string;
}

interface PurchaseBodyV1 {
  billingAddress: Address;
  credit_card: CardInfoV1;
  card_id: string;
  device_id: string;
  email: string;
  method_type: string;
  processor_name: string;
  secure_authentication: SecureAuthV1;
  shipping_address: Address;
  specific_fields: Object;
  store_code: string;
  token: string;
}

function generateCardInfoV1(address: Address, baseCreditCard: BaseCreditCard): CardInfoV1 {
  const expiration_date = baseCreditCard.expiration_date;
  if (expiration_date.length !== 4) {
    throw new Error('Invalid expiration date format. Expected format is MM/YYYY');
  }

  const expiry_month = expiration_date.substring(0, 2);
  const expiry_year = `20${expiration_date.substring(2, 4)}`;

  return {
    address1: address.address1,
    card_cvv: baseCreditCard.cvv_code,
    card_holder_dni: baseCreditCard.document_number,
    card_holder: baseCreditCard.cardholder_name,
    card_number: baseCreditCard.number,
    city: address.city,
    expiry_month: expiry_month,
    expiry_year: expiry_year,
    is_single_use: false,
    phone: address.phone,
    zip: address.zipcode,
  };
}

/**
 * returns a purchaseV1 payload body with credit card info
 *
 * @param orderToken - token for tokenized order using TOKENIZE_ORDER_AIRLINE_ORDER_API_EMA
 * @param creditCard - Not tokenized card - e.g. elavonVisaSuccessfull
 */
export function CreatePurchaseBodyV1(
  orderToken: string,
  creditCard?: BaseCreditCard,
  cardId?: string
): PurchaseBodyV1 {
  if ((!creditCard && !cardId) || (creditCard && cardId)) {
    throw new Error('Either creditCard or cardId must be provided');
  }

  const email = EmailGenerator.generateRegisteredUserEmail();
  const address = generateAddress(email);

  const result: PurchaseBodyV1 = {
    billingAddress: address,
    email: email,
    credit_card: creditCard ? generateCardInfoV1(address, creditCard) : null,
    card_id: cardId,
    device_id: '',
    method_type: 'credit_card',
    processor_name: 'ELAVON',
    secure_authentication: {
      eci: 'ECI123',
      cavv: 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      flow_type: 'challenge',
      xid: '5a56fdc9-6d47-5fee-8000-000000296743',
    },
    shipping_address: address,
    specific_fields: {},
    store_code: 'all',
    token: orderToken,
  };

  return result;
}

/**
 * returns an order payload body
 */
export function CreatePurchaseOrderV1(): any {
  const email = EmailGenerator.generateRegisteredUserEmail();
  const address = generateAddress(email);
  const order_id = crypto.randomUUID();

  return {
    order: {
      billing_address: address,
      currency: 'USD',
      discounts: [],
      display_items_total_amount: '$     3000.00',
      display_shipping_amount: 'USD0,00',
      display_sub_total: 'USD0',
      display_tax_amount: '$     1000.00',
      display_total_amount: '$     4000.00',
      display_total_discount: '',
      display_total_tax_amount: '',
      items_total_amount: 3000,
      items: [
        {
          brand: 'Generic Brand',
          category: 'Electronics',
          collections: ['Electronics', 'Headphones'],
          color: 'Black',
          description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean euismod bibendum laoreet.',
          details_url: '',
          displayPrice: '$ 3000.00',
          id: '789456123',
          image_url: 'https://cdn.stg.deuna.io/explore-deuna/assets/shirt.png',
          isbn: '123-456-789',
          item_details: [],
          manufacturer: 'Generic Manufacturer',
          name: 'Polo Shirt',
          options: 'string option',
          price: 3000,
          productTitle: 'Camisa Polo',
          quantity: 1,
          size: '',
          sku: 'HEADPH001',
          slug: 'polo-shirt',
          tax_amount: {
            original_amount: 0,
            discount_amount: 0,
            display_original_amount: '',
            amount: 0,
            currency: 'USD',
            currency_symbol: '$',
            display_amount: '$ 0.00',
          },
          taxable: true,
          total_amount: {
            amount: 3000,
            currency_symbol: '$',
            currency: 'USD',
            discount_amount: 0,
            display_amount: '$ 3000.00',
            display_original_amount: '$ 3000.00',
            original_amount: 0,
          },
          type: 'Electronics',
          unit_price: {
            amount: 3000,
            currency_symbol: '$',
            currency: 'MXN',
            discount_amount: 0,
            display_amount: '$ 3000.00',
            display_original_amount: '',
            original_amount: 3000,
          },
          uom: 'Piece',
          upc: 'string',
          weight: {
            weight: 1,
            unit: 'kg',
          },
        },
      ],
      order_id: order_id,
      payment_link: '',
      redirect_url: '',
      scheduled_at: '',
      shipping_address: address,
      shipping_amount: 0,
      shipping_methods: [],
      shipping_options: {
        type: 'delivery',
        details: {
          store_name: '',
          address: '',
          address_coordinates: {
            lat: 0,
            lng: 0,
          },
          contact: {
            name: '',
            phone: '',
          },
          additional_details: {},
        },
      },
      status: '',
      store_code: 'all',
      sub_total: 3000,
      tax_amount: 0,
      timezone: '',
      total_amount: 4000,
      total_discount: 0,
      total_tax_amount: 1000,
      user_instructions: 'This item is a gift.',
    },
    order_type: 'DEUNA_CHECKOUT',
    shipping_rate: {
      service_name: '',
      description: '',
      cost: 0,
      tax_amount: 0,
      display_tax_amount: '',
      reference: '',
      estimated_delivery_date: '',
      tax_code: '',
    },
  };
}

/*
 * =========================== FOR PURCHASE V2 ===========================
 */

interface SecureAuthV2 {
  cavv: string;
  three_ds_authentication_response: string;
  xid: string;
}

interface CardInfoV2 {
  address1: string;
  card_cvv: string;
  card_holder_dni: string;
  card_holder: string;
  card_number: string;
  city: string;
  country: string;
  expiry_month: string;
  expiry_year: string;
  phone: string;
  secure_authentication: SecureAuthV2;
  state: string;
  zip: string;
}

function generateCardInfoV2(address: Address, baseCreditCard: BaseCreditCard): CardInfoV2 {
  const expiration_date = baseCreditCard.expiration_date;
  if (expiration_date.length !== 4) {
    throw new Error('Invalid expiration date format. Expected format is MM/YYYY');
  }

  const expiry_month = expiration_date.substring(0, 2);
  const expiry_year = `20${expiration_date.substring(2, 4)}`;

  return {
    address1: address.address1,
    card_cvv: baseCreditCard.cvv_code,
    card_holder_dni: baseCreditCard.document_number,
    card_holder: baseCreditCard.cardholder_name,
    card_number: baseCreditCard.number,
    city: address.city,
    country: address.country_code,
    expiry_month: expiry_month,
    expiry_year: expiry_year,
    phone: address.phone,
    state: 'WA',
    zip: address.zipcode,
    secure_authentication: {
      cavv: 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      three_ds_authentication_response: 'Y',
      xid: '5a56fdc9-6d47-5fee-8000-000000296743',
    },
  };
}

/**
 * returns a purchaseV2 payload with credit card info
 *
 * @param creditCard - Not tokenized card - e.g. elavonVisaSuccessfull
 * @param cardId - Tokenized card id, created by apiCallNewman.createCard
 */
export function CreateBody(creditCard?: BaseCreditCard, cardId?: string): any {
  if ((!creditCard && !cardId) || (creditCard && cardId)) {
    throw new Error('Either creditCard or cardId must be provided');
  }

  const email = EmailGenerator.generateRegisteredUserEmail();
  const base_address = generateAddress(email);
  const card_info = creditCard ? generateCardInfoV2(base_address, creditCard) : { card_id: cardId };

  const order_id = crypto.randomUUID();

  const body_purchase_v2 = {
    order_type: 'AIRLINE_ORDER',
    order: {
      airline_information: {
        bookingItems: [
          {
            airline_3_digit_code: '001',
            airline_iata_designator: 'AA',
            e_ticket: true,
            legs: [
              {
                carrier_code: 'AA',
                carrier_name: 'American Airlines',
                fare_basis_code: 'Y1234',
                flight_number: 'AA100',
                destination: {
                  city: 'Los Angeles',
                  date: '2025-03-25',
                  iata_code: 'LAX',
                  time: '12:00',
                },
                origin: {
                  city: 'New York',
                  date: '2025-03-25',
                  iata_code: 'JFK',
                  time: '08:00',
                },
                seat_location: '12A',
                service_class: 'Economy',
                stopover_code: 'X',
                sub_total_amount: 300.0,
                tax_amount: 50.0,
                total_amount: 350.0,
              },
            ],
            passenger: {
              country_code: 'EC',
              date_of_birth: '1994-08-15',
              document_type: 'Passport',
              email: 'johndoe@example.com',
              first_name: 'Jean',
              frequent_flyer_code: 'FF12345',
              identity_document_number: 'A12345678',
              last_name: 'Roldan',
              middle_name: 'Carlos',
              phone: '+59398663773',
              title: 'Mr.',
              user_id: 'USR001',
            },
            pnr: `${generatePNR()}`,
            ticket_number: `${generateTicketNumber(10)}`,
            ticketing_travel_agency: {
              iata_code: '12345678',
              name: 'Best Travel Agency',
              agency_invoice_number: 'INV-98765',
            },
          },
        ],
      },
      billing_address: base_address,
      currency: 'USD',
      items: [
        {
          brand: 'Insurance',
          category: 'Trip Insurance',
          color: '',
          description: 'Insurance in case of flight delay or cancel',
          details_url: '',
          id: `${generateRandomNumber(3)}`,
          image_url:
            'https://images-staging.getduna.com/95463fb5-6279-4ec3-8ff9-fe07aacd2142/db5b698c57654116_domicilio_216_750x750_1662162887.png?d=200x200&format=webp',
          isbn: '',
          manufacturer: '',
          name: 'Trip Insurance',
          options: 'string option',
          quantity: 1,
          size: '',
          sku: 'INS45678',
          taxable: true,
          tax_amount: {
            amount: 0,
            currency_symbol: '$',
            currency: 'USD',
          },
          total_amount: {
            amount: 1000,
            currency_symbol: '$',
            currency: 'USD',
            original_amount: 1000,
          },
          type: 'digital',
          unit_price: {
            amount: 1000,
            currency_symbol: '$',
            currency: 'USD',
          },
          uom: 'string',
          upc: 'string',
          weight: {
            amount: 0,
            unit: 'kg',
          },
        },
      ],
      order_id: order_id,
      shipping_address: base_address,
      store_code: 'all',
      sub_total: 4000,
      total_amount: 4000,
    },
    payer_info: {
      email: email,
      save_user_info: true,
    },
    payment_source: {
      method_type: 'credit_card',
      card_info: card_info,
    },
  };

  return body_purchase_v2;
}

/**
 * returns a PurchaseRequestV2 body for a pre-tokenized order with untokenized card.
 */
export function CreatePurchaseBodyV2WithToken(
  orderToken: string,
  creditCard: BaseCreditCard
): PurchaseRequestV2 {
  const email = EmailGenerator.generateRegisteredUserEmail();
  const address = generateAddress(email);

  return {
    order_token: orderToken,
    payer_info: { email },
    payment_source: {
      method_type: MethodType.CREDIT_CARD,
      processor: 'ELAVON',
      card_info: generateCardInfoV2(address, creditCard),
    },
  };
}

/**
 * returns a PurchaseRequestV2 body for a pre-tokenized order with tokenized card (card_id).
 */
export function CreatePurchaseBodyV2WithCardId(
  orderToken: string,
  cardId: string
): PurchaseRequestV2 {
  const email = EmailGenerator.generateRegisteredUserEmail();

  return {
    order_token: orderToken,
    payer_info: { email },
    payment_source: {
      method_type: MethodType.CREDIT_CARD,
      processor: 'ELAVON',
      card_info: {
        card_id: cardId,
      },
    },
  };
}

export function getFileAccept(batchId: string): string {
  log(`Subiendo archivo para el batch: ${batchId}`);
  const content = `DEST: TESTDEST                                                                      
ATTN: ATTNINFO
FILE: ${batchId}.txt
Fax Date and Time:  April  1, 2025  09:31                                       
                                                                                
                                          MERCHANT DIRECT SUBMISSION - FILE SUMMARY REPORT                                                                                             
                                                                                                                                                                                       
                                                  DEPOSIT SOURCE: ELA1  ELA SWITCH                                                                                                     
                                                                                                                                                                                       
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                                                                                                                                                                                       
                                                 MDS DEPOSIT FILE PROCESSING SUMMARY                                                                                                   
                                                 -----------------------------------                                                                                                   
                                                                                                                                                                                       
  FILE NO.    RECORDS     SALES      SALES VALUE   REFUNDS     REFUND VALUE     TOTAL        NET VALUE   STATUS                                                                        
  --------    -------   -------   --------------   -------   --------------   -------   --------------   ------------------------                                                      
  9910            307       101          5891.62         0             0.00       101          5891.62                                                                                 
                                                                                                                                                                                       
  REJECTS                     0             0.00         0             0.00         0             0.00                                                                                 
  --------    -------   -------   --------------   -------   --------------   -------   --------------   ------------------------                                                      
  NET VAL                   101          5891.62         0             0.00       101          5891.62                                                                                 
  --------    -------   -------   --------------   -------   --------------   -------   --------------   ------------------------                                                      
                                                                                                                                                                                       
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                                                                                                                                                                                       
                                    Elavon                                      
                    Settlement File Summary Fax Transmittal                     
                                                                                
  MID               Name                            Transactions  Amount        
  ----------------  ------------------------------  ------------  ------------  
  290008111         US MID AUTO                     Batch Number - 00000001     
                                    Sales                    101       5891.62  
                                    Refunds                    0          0.00  
                                    Reject Sales               0          0.00  
                                    Reject Refunds             0          0.00  
                                                                                
--------------------------------------------------------------------------------
                                                                                
  File Net Total                    - Accepted:                                 
                                       Sales                 101       5891.62  
                                       Refunds                 0          0.00  
                                    - Rejected:                                 
                                       Sales                   0          0.00  
                                       Refunds                 0          0.00  
                                                                                                                                                                                       
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                                                                                                                                                                                       
                                                   *  E N D   O F   R E P O R T  *                                                                                                     
                                                                                                                                                                                       
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------`;

  return btoa(content);
}
