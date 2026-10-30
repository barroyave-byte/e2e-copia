import { CreateWebhookData } from '@support/http/models/checkoutConfiguration';

/**
 * Generates a random number between min and max (inclusive)
 */
const randomBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generates webhook configuration with dynamic event_name
 */

export const buildWebhookWithCustomFields = () => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  url: 'https://eo4rris0g0moq48.m.pipedream.net',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount'],
    custom_fields: ['tip_amount', 'countries'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
    custom_fields: ['tip_amount'],
  },
});

export const buildWebhookWithoutHttpMethod = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  url: 'https://eo4rris0g0moq48.m.pipedream.net',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
});

export const buildWebhookWithHttpMethodInvalid = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  http_method: 'ANY',
  url: 'https://eo4rris0g0moq48.m.pipedream.net',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
});

export const buildWebhookWithHttpMethodNotSupported = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  http_method: 'OPTIONS',
  url: 'https://eo4rris0g0moq48.m.pipedream.net',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
});

export const buildWebhookWithInvalidUrl = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  http_method: 'PUT',
  url: 'eo4rris0g0moq48pipedream',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
});

export const buildWebhookWithInvalidUrlParams = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  http_method: 'PUT',
  url: 'eo4rris0g0moq48pipedream',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
});

export const buildWebhookWithInvalidHeadersParams = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  http_method: 'PUT',
  url: 'https://eo4rris0g0moq48.m.pipedream.net/510f1168-30fd-4dd0-8186-55cbf4e24d2d',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  headers: [
    { key: 'X-Authorization', value: '{{ .Order.CustomFields1.Data.external_auth_token}}' },
  ],
  params: [{ key: 'card_id', value: '{{ .Order.CustomFields1.Data.card_id}}' }],
});

export const buildWebhookWitHeadersParamsWithCharactersSpecial = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  http_method: 'PUT',
  url: 'https://eo4rris0g0moq48.m.pipedream.net/510f1168-30fd-4dd0-8186-55cbf4e24d2d',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  headers: [
    { key: 'X-Authorization?', value: '{{ .Order.CustomFields.Data.external_auth_token}}' },
  ],
  params: [{ key: 'card_id?', value: '{{ .Order.CustomFields.Data.card_id}}' }],
});

export const buildWebhookWitHeadersParamsWithSpaces = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  http_method: 'PUT',
  url: 'https://eo4rris0g0moq48.m.pipedream.net/510f1168-30fd-4dd0-8186-55cbf4e24d2d',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  headers: [
    { key: 'X -Authorization?', value: '{{ .Order.CustomFields.Data.external_auth_token}}' },
  ],
  params: [{ key: ' card_id?', value: '{{ .Order.CustomFields.Data.card_id}}' }],
});

export const buildWebhookWithParamsRepeted = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  http_method: 'PUT',
  url: 'https://eo4rris0g0moq48.m.pipedream.net/510f1168-30fd-4dd0-8186-55cbf4e24d2d',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  params: [
    { key: 'param1', value: '{{ .Order.CustomFields.Data.card_id}}' },
    { key: 'param1', value: '{{ .Order.CustomFields.Data.card_id}}' },
  ],
});

export const buildWebhookWithHeadersRepeted = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  http_method: 'PUT',
  url: 'https://eo4rris0g0moq48.m.pipedream.net/510f1168-30fd-4dd0-8186-55cbf4e24d2d',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  headers: [
    { key: 'X-Authorization', value: '{{ .Order.CustomFields.Data.external_auth_token}}' },
    { key: 'X-Authorization', value: '{{ .Order.CustomFields.Data.external_auth_token}}' },
  ],
});

export const buildWebhookWithHeadersParamsAndMethodValid = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  http_method: 'PUT',
  url: 'https://eo4rris0g0moq48.m.pipedream.net/510f1168-30fd-4dd0-8186-55cbf4e24d2d',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  headers: [{ key: 'X-Authorization', value: '{{ .Order.CustomFields.Data.external_auth_token}}' }],
  params: [{ key: 'card_id', value: '{{ .Order.CustomFields.Data.card_id}}' }],
  query_params: [{ key: 'business_id', value: '{{ .Order.CustomFields.Data.business_id}}' }],
});

export const buildWebhookWithParamsAndMethodValidWithoutHeaders = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  http_method: 'PUT',
  url: 'https://eo4rris0g0moq48.m.pipedream.net/510f1168-30fd-4dd0-8186-55cbf4e24d2d',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  params: [{ key: 'card_id', value: '{{ .Order.CustomFields.Data.card_id}}' }],
  query_params: [{ key: 'business_id', value: '{{ .Order.CustomFields.Data.business_id}}' }],
});

export const buildWebhookWithHeadersAndMethodValidWithoutParams = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  http_method: 'PUT',
  url: 'https://eo4rris0g0moq48.m.pipedream.net',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount', 'ShippingAmount', 'Subtotal'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  headers: [{ key: 'X-Authorization', value: '{{ .Order.CustomFields.Data.external_auth_token}}' }],
});

export const buildWebHookWithTemplateTransformation = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  url: 'https://eo4rris0g0moq48.m.pipedream.net',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  response_template:
    '{ "order": { "order_id": "{{ .result.uuid }}" , "custom_fields": { "business_id": "{{ .result.business_id }}" }}}',
  response_data:
    '{ "error": false, "result": { "uuid": "aeb5f2fe-a06f-40cb-bfac-13d142bbbf65", "user_id": 3770, "status": 0, "business_id": 146, "comment": null, "driver_tip_rate": 11.46, "paymethod_id": 168, "driver_tip": 20, "quantity": 1, "pay_reference": null, "paymethod_data": { "data": { "card_id": 5135, "device_session_id": "xhmcbaeJgCYPUv0zpd4Z0QX0ZXFRi71G" } }, "place_id": null, "delivery_option_id": null, "products": [ { "id": 72271, "category_id": 3667, "images": "https://d347gjkxx0g7x1.cloudfront.net/menu/img/dominos/4Q.png", "business_id": 146, "inventoried": false, "stock": 0, "name": "4 quesos", "price": 219, "in_offer": false, "offer_price": null, "estimated_person": null, "barcode": null, "barcode_alternative": null, "code": "O1ljSIhWgl", "comment": null, "quantity": 1, "total": 349, "status": 0, "priority": 0, "cost_price": null, "cost_offer_price": null, "calories": null, "weight": null, "weight_unit": null, "minimum_per_order": 1, "maximum_per_order": null, "tax": { "id": null, "name": "Tax", "description": "General tax", "rate": 16, "type": 1 }, "fee": { "id": null, "name": "Service fee", "description": "General service fee", "type": "product", "fixed": 0, "percentage": 0 }, "offer_rate": 0, "offer_rate_type": 1, "offer_include_options": true, "tags": [], "calendar_event": null, "valid_calendar": true, "balance": 1, "valid_quantity": true, "valid_minimum": true, "valid_maximum": true, "combo": "0", "integration_id": "4Q", "ingredients": {}, "options": { "id:39048": { "id": 39048, "name": "Elige tu tamaño preferido", "suboptions": { "id:644834": { "id": 644834, "name": "DOMINATOR", "price": 130, "half_price": null, "position": "whole", "quantity": 1, "selected": true, "total": 130 } }, "balance": 1 }, "id:39049": { "id": 39049, "name": "Elige tu masa", "suboptions": { "id:644833": { "id": 644833, "name": "ORIGINAL", "price": 0, "half_price": null, "position": "whole", "quantity": 1, "selected": true, "total": 0 } }, "balance": 1 } }, "summary": { "total": 174.5, "subtotal": 300.86, "subtotal_with_discount": 150.43, "tax": 48.14, "fee_fixed": 0, "fee_percentage": 0, "fee_percentage_after_discount": 0, "discount": 174.5, "tax_after_discount": 24.07 }, "valid_menu": true, "valid": true, "offers": [ { "id": 4432, "discounts": { "i:0": 174.5 }, "summary": { "discount": 174.5 }, "name": "MASTERCARD", "description": "Obten 50 de descuento con mastercard.", "image": null, "type": 1, "rate": 50, "target": 1, "condition_type": 1, "rate_type": 1, "label": "50% off Mastercard" } ] } ], "spot_number": null, "vehicle": null, "group": null, "business": { "name": "Dominos Pizza - Lab QA", "slug": "dominos_lab_qa_dominos_12308", "logo": "https://d2gjwc6pypyhyf.cloudfront.net/logos/dp_logo.png", "header": "https://res.cloudinary.com/ordering2/image/upload/alsea-staging/eixxlo44tp6plsavhr8q.jpg", "service_fee": 0, "tax_type": 1, "tax": 16, "currency": "MXN", "delivery_time": "0:55", "pickup_time": "0:00", "schedule": [ { "enabled": true, "lapses": [ { "open": { "hour": 8, "minute": 0 }, "close": { "hour": 22, "minute": 0 } } ] }, { "enabled": true, "lapses": [ { "open": { "hour": 0, "minute": 0 }, "close": { "hour": 23, "minute": 0 } } ] }, { "enabled": true, "lapses": [ { "open": { "hour": 8, "minute": 0 }, "close": { "hour": 23, "minute": 59 } } ] }, { "enabled": true, "lapses": [ { "open": { "hour": 0, "minute": 0 }, "close": { "hour": 23, "minute": 59 } } ] }, { "enabled": true, "lapses": [ { "open": { "hour": 0, "minute": 0 }, "close": { "hour": 23, "minute": 0 } } ] }, { "enabled": true, "lapses": [ { "open": { "hour": 6, "minute": 0 }, "close": { "hour": 23, "minute": 0 } } ] }, { "enabled": true, "lapses": [ { "open": { "hour": 8, "minute": 0 }, "close": { "hour": 23, "minute": 0 } } ] } ], "location": { "lat": 19.4504769, "lng": -99.1552378 }, "address": "Manuel Carpio 65, Santa María la Ribera, Mexico City, CDMX, Mexico", "address_notes": "Interior ", "franchise_id": 34 }, "metafields": [], "place": null, "subtotal": 300.86, "valid_address": true, "delivery_zone_id": 280, "delivery_price": 0, "minimum": 0, "valid_minimum": true, "valid_maximum": true, "maximum": null, "valid_schedule": true, "valid_products": true, "valid": true, "tax": 48.14, "tax_with_discount": 24.07, "service_fee": 0, "service_fee_with_discount": 0, "subtotal_to_calculate": 349, "subtotal_with_discount": 150.43, "delivery_price_with_discount": 0, "discount": 174.5, "offers": [ { "id": 4432, "discounts": { "O1ljSIhWgl": { "i:0": 174.5 } }, "summary": { "discount": 174.5 }, "name": "MASTERCARD", "description": "Obten 50 de descuento con mastercard.", "image": null, "type": 1, "rate": 50, "target": 1, "condition_type": 1, "rate_type": 1, "label": "50% off Mastercard" } ], "tax_after_discount": 24.07, "taxes": [ { "id": null, "name": "Tax", "description": "General tax", "rate": 16, "type": 1, "summary": { "tax": 48.14, "tax_after_discount": 24.07 } } ], "tax_rate": 16, "fees": [ { "id": null, "name": "Service fee", "description": "General service fee", "type": "product", "fixed": 0, "percentage": 0, "summary": { "fixed": 0, "percentage": 0, "percentage_after_discount": 0 } } ], "service_fee_rate": 0, "payment_events": [], "paid_amount": 0, "balance": 194.5, "total": 194.5, "current_offer_id": null } }',
});

export const buildWebhookFieldsAcceptedByDEUNA = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  url: 'https://eo4rris0g0moq48.m.pipedream.net',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  response_template:
    '{ "order": { "order_token": "{{ .result.uuid }}", "store_code": "{{ .result.uuid }}", "order_id": "{{ .result.uuid }}", "currency": "{{ .result.uuid }}", "items" : [{ "id": "{{ .result.uuid }}", "name": "{{ .result.uuid }}", "total_amount" : { "amount": {{ .result.total }}, "original_amount": {{ .result.total }}, "currency": "USD", "currency_symbol": "{{ .result.uuid }}" }, "unit_price" : { "amount": {{ .result.total }}, "currency": "USD", "currency_symbol": "{{ .result.uuid }}" }, "tax_amount" : { "amount": {{ .result.total }}, "currency": "{{ .result.uuid }}", "currency_symbol": "{{ .result.uuid }}" }, "discounts" : [{ "amount": {{ .result.total }}, "ref_idx": "{{ .result.uuid }}" }] }, { "id": "{{ .result.uuid }}", "name": "{{ .result.uuid }}" }], "discounts" : [{ "amount": {{ .result.total }}, "code": "{{ .result.uuid }}", "free_shipping": { "is_free_shipping": true } }], "shipping_address" : { "id": {{ .result.user_id }}, "user_id": "{{ .result.uuid }}" }, "shipping_tax_amount": {{ .result.total }}, "total_tax_amount": {{ .result.total }}, "user_instructions": "{{ .result.uuid }}", "metadata": { "key1": "{{ .result.uuid }}" }, "payment" : { "payment_id": "{{ .result.uuid }}" }, "gift_cards" : [{ "amount": {{ .result.total }}, "code": "{{ .result.uuid }}" }], "shipping" : { "original_amount": {{ .result.total }}, "total_discount": {{ .result.total }}, "discounts": [{ "amount": {{ .result.total }}, "ref_idx": "{{ .result.uuid }}" }] }, "custom_fields": { "business_id" : "{{ .result.business_id }}" }}}',
  response_data:
    '{ "error": false, "result": { "uuid": "aeb5f2fe-a06f-40cb-bfac-13d142bbbf65", "user_id": 3770, "status": 0, "business_id": 146, "comment": null, "driver_tip_rate": 11.46, "paymethod_id": 168, "driver_tip": 20, "quantity": 1, "pay_reference": null, "paymethod_data": { "data": { "card_id": 5135, "device_session_id": "xhmcbaeJgCYPUv0zpd4Z0QX0ZXFRi71G" } }, "place_id": null, "delivery_option_id": null, "products": [ { "id": 72271, "category_id": 3667, "images": "https://d347gjkxx0g7x1.cloudfront.net/menu/img/dominos/4Q.png", "business_id": 146, "inventoried": false, "stock": 0, "name": "4 quesos", "price": 219, "in_offer": false, "offer_price": null, "estimated_person": null, "barcode": null, "barcode_alternative": null, "code": "O1ljSIhWgl", "comment": null, "quantity": 1, "total": 349, "status": 0, "priority": 0, "cost_price": null, "cost_offer_price": null, "calories": null, "weight": null, "weight_unit": null, "minimum_per_order": 1, "maximum_per_order": null, "tax": { "id": null, "name": "Tax", "description": "General tax", "rate": 16, "type": 1 }, "fee": { "id": null, "name": "Service fee", "description": "General service fee", "type": "product", "fixed": 0, "percentage": 0 }, "offer_rate": 0, "offer_rate_type": 1, "offer_include_options": true, "tags": [], "calendar_event": null, "valid_calendar": true, "balance": 1, "valid_quantity": true, "valid_minimum": true, "valid_maximum": true, "combo": "0", "integration_id": "4Q", "ingredients": {}, "options": { "id:39048": { "id": 39048, "name": "Elige tu tamaño preferido", "suboptions": { "id:644834": { "id": 644834, "name": "DOMINATOR", "price": 130, "half_price": null, "position": "whole", "quantity": 1, "selected": true, "total": 130 } }, "balance": 1 }, "id:39049": { "id": 39049, "name": "Elige tu masa", "suboptions": { "id:644833": { "id": 644833, "name": "ORIGINAL", "price": 0, "half_price": null, "position": "whole", "quantity": 1, "selected": true, "total": 0 } }, "balance": 1 } }, "summary": { "total": 174.5, "subtotal": 300.86, "subtotal_with_discount": 150.43, "tax": 48.14, "fee_fixed": 0, "fee_percentage": 0, "fee_percentage_after_discount": 0, "discount": 174.5, "tax_after_discount": 24.07 }, "valid_menu": true, "valid": true, "offers": [ { "id": 4432, "discounts": { "i:0": 174.5 }, "summary": { "discount": 174.5 }, "name": "MASTERCARD", "description": "Obten 50 de descuento con mastercard.", "image": null, "type": 1, "rate": 50, "target": 1, "condition_type": 1, "rate_type": 1, "label": "50% off Mastercard" } ] } ], "spot_number": null, "vehicle": null, "group": null, "business": { "name": "Dominos Pizza - Lab QA", "slug": "dominos_lab_qa_dominos_12308", "logo": "https://d2gjwc6pypyhyf.cloudfront.net/logos/dp_logo.png", "header": "https://res.cloudinary.com/ordering2/image/upload/alsea-staging/eixxlo44tp6plsavhr8q.jpg", "service_fee": 0, "tax_type": 1, "tax": 16, "currency": "MXN", "delivery_time": "0:55", "pickup_time": "0:00", "schedule": [ { "enabled": true, "lapses": [ { "open": { "hour": 8, "minute": 0 }, "close": { "hour": 22, "minute": 0 } } ] }, { "enabled": true, "lapses": [ { "open": { "hour": 0, "minute": 0 }, "close": { "hour": 23, "minute": 0 } } ] }, { "enabled": true, "lapses": [ { "open": { "hour": 8, "minute": 0 }, "close": { "hour": 23, "minute": 59 } } ] }, { "enabled": true, "lapses": [ { "open": { "hour": 0, "minute": 0 }, "close": { "hour": 23, "minute": 59 } } ] }, { "enabled": true, "lapses": [ { "open": { "hour": 0, "minute": 0 }, "close": { "hour": 23, "minute": 0 } } ] }, { "enabled": true, "lapses": [ { "open": { "hour": 6, "minute": 0 }, "close": { "hour": 23, "minute": 0 } } ] }, { "enabled": true, "lapses": [ { "open": { "hour": 8, "minute": 0 }, "close": { "hour": 23, "minute": 0 } } ] } ], "location": { "lat": 19.4504769, "lng": -99.1552378 }, "address": "Manuel Carpio 65, Santa María la Ribera, Mexico City, CDMX, Mexico", "address_notes": "Interior ", "franchise_id": 34 }, "metafields": [], "place": null, "subtotal": 300.86, "valid_address": true, "delivery_zone_id": 280, "delivery_price": 0, "minimum": 0, "valid_minimum": true, "valid_maximum": true, "maximum": null, "valid_schedule": true, "valid_products": true, "valid": true, "tax": 48.14, "tax_with_discount": 24.07, "service_fee": 0, "service_fee_with_discount": 0, "subtotal_to_calculate": 349, "subtotal_with_discount": 150.43, "delivery_price_with_discount": 0, "discount": 174.5, "offers": [ { "id": 4432, "discounts": { "O1ljSIhWgl": { "i:0": 174.5 } }, "summary": { "discount": 174.5 }, "name": "MASTERCARD", "description": "Obten 50 de descuento con mastercard.", "image": null, "type": 1, "rate": 50, "target": 1, "condition_type": 1, "rate_type": 1, "label": "50% off Mastercard" } ], "tax_after_discount": 24.07, "taxes": [ { "id": null, "name": "Tax", "description": "General tax", "rate": 16, "type": 1, "summary": { "tax": 48.14, "tax_after_discount": 24.07 } } ], "tax_rate": 16, "fees": [ { "id": null, "name": "Service fee", "description": "General service fee", "type": "product", "fixed": 0, "percentage": 0, "summary": { "fixed": 0, "percentage": 0, "percentage_after_discount": 0 } } ], "service_fee_rate": 0, "payment_events": [], "paid_amount": 0, "balance": 194.5, "total": 194.5, "current_offer_id": null } }',
});

export const buildTemplateTransformationWithError = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  url: 'https://eo4rris0g0moq48.m.pipedream.net',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  response_template: '{ "order" : { "nof_found": "{{ .result.uuid }}"}}',
  response_data: '{ "error": false, "result": { "uuid": "aeb5f2fe-a06f-40cb-bfac-13d142bbbf65"}}',
});

export const buildTemplateTransformationWithInvalidJson = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  url: 'https://eo4rris0g0moq48.m.pipedream.net',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  response_template:
    '{ "order": {"order_id": "{{ .result.uuid }}" "store_code": "{{ .result.uuid }}" }}',
  response_data: '{ "error": false, "result": { "uuid": "aeb5f2fe-a06f-40cb-bfac-13d142bbbf65"}}',
});

export const buildTemplateTransformationWithJsonWithoutBraces = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  url: 'https://eo4rris0g0moq48.m.pipedream.net',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  response_template:
    '{ "order": {"order_id": "{{ .result.uuid }", "store_code": "{{ .result.uuid }}" }}',
  response_data: '{ "error": false, "result": { "uuid": "aeb5f2fe-a06f-40cb-bfac-13d142bbbf65"}}',
});

export const buildTemplateTransformationWithJsonWithoutQuotes = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  url: 'https://eo4rris0g0moq48.m.pipedream.net',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  response_template:
    '{ order: { "order_id": "{{ .result.uuid }}", "store_code": "{{ .result.uuid }}" }}',
  response_data: '{ "error": false, "result": { "uuid": "aeb5f2fe-a06f-40cb-bfac-13d142bbbf65"}}',
});

export const buildTemplateTransformationWithJsonWithoutColon = (): CreateWebhookData => ({
  event_name: `event_9_${randomBetween(20, 1000)}`,
  url: 'https://eo4rris0g0moq48.m.pipedream.net',
  fields_update: {
    fields: ['StoreCode', 'TaxAmount'],
  },
  response_body: {
    fields: ['Order', 'ShippingRate'],
  },
  response_template:
    '{ "order" : {"order_id"  "{{ .result.uuid }}", "store_code": "{{ .result.uuid }}" }}',
  response_data: '{ "error": false, "result": { "uuid": "aeb5f2fe-a06f-40cb-bfac-13d142bbbf65"}}',
});
