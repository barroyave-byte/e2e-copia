import envConfig from '@support/envConfig';
import { CreateCustomFieldData } from '../../models/checkoutConfiguration';
import { ExternalEndpointData } from '../../models/merchantAuth';
import { CreateWebhookData } from '../../models/checkoutConfiguration';

const VTEX_API_HEADERS = [
  { key: 'X-VTEX-API-AccountName', value: 'e2e' },
  { key: 'X-VTEX-API-AppKey', value: 'vtex-appkey-test' },
  { key: 'X-VTEX-API-AppToken', value: 'vtex-apptoken-test' },
];

const VTEX_ORDER_RESPONSE_TEMPLATE =
  '{{$orderform_totalizers_items := 0}}{{$orderform_paymentdata_giftcards :=0}}{{$orderform_totalizers_discount_coupons :=0}}{{$orderform_totalizers_shipping := 0}}{{$orderform_totalizers_tax := 0}}{{$order_total_interest_amount := 0}}{{$order_total_discount := 0}}{{$order_sub_total := 0}}{{$orderform_value_total := 0}}{{ $has_gift_card := false }}{{ $has_discount := false }}{{- if .totalizers }} {{- range $index, $item := .totalizers }} {{- if eq $item.id "Items" }} {{$orderform_totalizers_items = $item.value}} {{- else if eq $item.id "Discounts" }} {{$orderform_totalizers_discount_coupons = mul $item.value -1 | toInt}} {{- else if eq $item.id "Shipping" }} {{$orderform_totalizers_shipping = $item.value}} {{- else if eq $item.id "Tax" }} {{$orderform_totalizers_tax = $item.value}} {{- end }} {{- end }}{{- end }}{{- if .paymentData.giftCards }} {{ $has_gift_card = true }} {{- range $index, $item := .paymentData.giftCards }} {{- $orderform_paymentdata_giftcards = add $orderform_paymentdata_giftcards $item.value }} {{- end }}{{- end }}{{- if .ratesAndBenefitsData.rateAndBenefitsIdentifiers }} {{ $has_discount = true }}{{- end }}{{- if .paymentData.payments }} {{- range $index, $item := .paymentData.payments }} {{- if eq $item.paymentSystem "752" }} {{$order_total_interest_amount = sub $item.value $item.referenceValue}} {{- end }} {{- end }}{{- end }}{{$orderform_value_total = add .value $order_total_interest_amount}}{{$orderform_value_total = sub $orderform_value_total $orderform_paymentdata_giftcards}}{{$order_total_discount = add $orderform_paymentdata_giftcards $orderform_totalizers_discount_coupons }}{{$order_sub_total = sub $orderform_value_total ($orderform_totalizers_tax | toInt) }}{ "order": { "total_interest_amount": {{ $order_total_interest_amount | toInt }}, "items_total_amount": {{ $orderform_totalizers_items | toInt }}, "total_discount": {{ $order_total_discount | toInt }}, "shipping_amount": {{ $orderform_totalizers_shipping | toInt }}, "sub_total": {{ $order_sub_total | toInt }}, "total_tax_amount": {{ $orderform_totalizers_tax | toInt }}, "tax_amount": {{ $orderform_totalizers_tax | toInt }}, "total_amount": {{ $orderform_value_total | toInt }}, "items": [ {{- range $index, $item := .items }} {{$order_items_total_amount_amount := 0}} {{$order_items_total_amount_original_amount := 0}} {{$order_items_total_amount_total_discount :=0}} {{$order_items_unit_price_amount := 0}} {{$order_items_tax_amount_amount := 0}} {{$order_items_total_amount_amount = $item.priceDefinition.total | toInt }} {{$order_items_total_amount_original_amount = mul ($item.price | toInt) ($item.quantity | toInt) }} {{$order_items_total_amount_total_discount = sub $order_items_total_amount_original_amount $order_items_total_amount_amount }} {{$order_items_unit_price_amount = $item.priceDefinition.calculatedSellingPrice | toInt }} {{$order_items_tax_amount_amount = $item.tax | toInt }} { "id": "{{ $item.id }}", "quantity": {{ $item.quantity | toInt }}, "total_amount": { "amount": {{ $order_items_total_amount_amount }}, "original_amount": {{ $order_items_total_amount_original_amount }}, "total_discount": {{ $order_items_total_amount_total_discount }} }, "unit_price": { "amount": {{ $order_items_unit_price_amount }} }, "tax_amount": { "amount": {{ $order_items_tax_amount_amount }} } }{{- if ne $index (sub (len $.items) 1) }},{{- end }} {{- end }} ], "discounts": [ {{- range $index, $benefit := .ratesAndBenefitsData.rateAndBenefitsIdentifiers }} {{- $coupon_amount := 0 }} {{- range $item := $.items }} {{- range $tag := $item.priceTags }} {{- if and (eq $tag.identifier $benefit.id) (not $tag.isPercentual) }} {{- $coupon_amount = add $coupon_amount $tag.value }} {{- end }} {{- end }} {{- end }} { "code": "{{ if index $benefit.matchedParameters `couponCode@Marketing` }}{{ index $benefit.matchedParameters `couponCode@Marketing` }}{{ else if index $benefit.matchedParameters `marketingTags` }}{{ index $benefit.matchedParameters `marketingTags` }}{{ else }}{{ $benefit.id }}{{ end }}", "reference": "{{ $benefit.id }}", "description": "{{ if $benefit.description }}{{ removeEscapeCharacters $benefit.description }}{{ else }}Promoción aplicada{{ end }}", "type": "{{ if index $benefit.matchedParameters `couponCode@Marketing` }}coupon{{ else if index $benefit.matchedParameters `marketingTags` }}marketing_tag{{ else }}promotion{{ end }}", "amount": {{ mul $coupon_amount -1 | toInt }} }{{- if ne $index (sub (len $.ratesAndBenefitsData.rateAndBenefitsIdentifiers) 1) }},{{- end }} {{- end }} {{- if (and $has_gift_card $has_discount) }},{{- end }} {{- range $index, $item := .paymentData.giftCards }} { "code": "{{ $item.redemptionCode }}", "reference": "{{ $item.id }}", "description": "{{ $item.redemptionCode }}", "type": "gift_card", "amount": {{ $item.value | toInt }} }{{- if ne $index (sub (len $.paymentData.giftCards) 1) }},{{- end }} {{- end }} ], "gift_cards": [ {{- range $index, $item := .paymentData.giftCards }} { "code": "{{ $item.id }}", "reference": "{{ $item.redemptionCode }}", "description": "{{ $item.redemptionCode }}", "amount": {{ $item.value | toInt }}, "details_url": "{{ $item.redemptionCode }}" }{{- if ne $index (sub (len $.paymentData.giftCards) 1) }},{{- end }} {{- end }} ] }}';

export interface VtexExternalEndpointData extends ExternalEndpointData {
  headers: Array<{ key: string; value: string }>;
}

export interface VtexWebhookBodies {
  updateMarketingData: CreateWebhookData;
  updatePaymentData: CreateWebhookData;
  syncOrderNotification: CreateWebhookData;
}

export class VtexMiddlewareConfig {
  static customFields(): CreateCustomFieldData[] {
    return ['order_form_id', 'vtex_chko_auth', 'checkout_data_access'].map((name) => ({
      field_name: name,
      placeholder: name,
      field_type: 'input',
      validation: { required: false },
    }));
  }

  static externalEndpoints(merchantId: string): {
    vtexCart: VtexExternalEndpointData;
    masterData: VtexExternalEndpointData;
    mci: VtexExternalEndpointData;
  } {
    return {
      vtexCart: {
        url: 'https://e2e.myvtex.com/api/checkout/pub/orderForm/{order_form_id}',
        http_method: 'GET',
        headers: VTEX_API_HEADERS,
        config_type: 'VtexCart',
      },
      masterData: {
        url: 'https://e2e.myvtex.com/api/dataentities/CB/search?_fields=id,category,email&_where=id={document_id}',
        http_method: 'GET',
        headers: VTEX_API_HEADERS,
        config_type: 'MasterData',
      },
      mci: {
        url: `${envConfig.URL_MIDDLEWARE}/api/v1/merchants/${merchantId}/transactions/{transaction_id}/installments/mci?bin={bin}&salesChannel=1&paymentProcessors=t1pagos`,
        http_method: 'GET',
        headers: VTEX_API_HEADERS,
        config_type: 'MCI',
      },
    };
  }

  static webhooks(vtexMiddlewareUrl: string, privateKey: string): VtexWebhookBodies {
    const marketingPaymentCommonFields = {
      fields_update: {
        fields: [
          'TotalAmount',
          'ItemsTotalAmount',
          'SubTotal',
          'TaxAmount',
          'TotalTaxAmount',
          'TotalDiscount',
          'ShippingAmount',
          'TotalInterestAmount',
          'Discounts',
          'Items.TotalAmount',
          'Items.UnitPrice',
          'Items.TaxAmount',
        ],
      },
      response_body: { fields: ['Order'] },
      error_response_template: '{ "description": "{{ .error.message}}" }',
      response_template: VTEX_ORDER_RESPONSE_TEMPLATE,
    };

    return {
      updateMarketingData: {
        event_name: 'update_marketing_data',
        http_method: 'POST',
        url: 'https://e2e.myvtex.com/api/checkout/pub/orderForm/{{order_form_id}}/attachments/marketingData',
        headers: [
          { key: 'X-VTEX-API-AppKey', value: 'vtex-appkey-test' },
          { key: 'X-VTEX-API-AppToken', value: 'vtex-apptoken-test' },
        ],
        params: [
          {
            key: 'order_form_id',
            value:
              '{{ if .Order.CustomFields.Data.order_form_id }}{{ .Order.CustomFields.Data.order_form_id }}{{else}}{{ .Order.OrderID}}{{end}}',
          },
        ],
        response_data:
          '{"value":9500,"totalizers":[{"id":"Items","name":"Items","value":10000},{"id":"Discounts","name":"Discounts","value":-1000},{"id":"Shipping","name":"Shipping","value":500},{"id":"Tax","name":"Tax","value":200}],"items":[{"id":"SKU123","quantity":1,"price":10000,"tax":200,"priceDefinition":{"total":9000,"calculatedSellingPrice":9000},"priceTags":[{"identifier":"PROMO1","isPercentual":false,"value":-1000}]}],"paymentData":{"giftCards":[{"id":"GCID_XYZ","redemptionCode":"GIFT-CARD-2025","value":500}],"payments":[{"paymentSystem":"752","value":9200,"referenceValue":9000},{"paymentSystem":"6","value":100,"referenceValue":100}]},"ratesAndBenefitsData":{"rateAndBenefitsIdentifiers":[{"id":"PROMO1","name":"Coupon","description":"Special 10 Dollar Off Coupon","matchedParameters":{"couponCode@Marketing":"SUMMER10"}}]}}',
        ...marketingPaymentCommonFields,
      },

      updatePaymentData: {
        event_name: 'update_payment_data',
        http_method: 'POST',
        url: 'https://e2e.myvtex.com/api/checkout/pub/orderForm/{{order_form_id}}/attachments/paymentData',
        headers: [
          { key: 'X-VTEX-API-AppKey', value: 'vtex-appkey-test' },
          { key: 'X-VTEX-API-AppToken', value: 'vtex-apptoken-test' },
        ],
        params: [
          {
            key: 'order_form_id',
            value:
              '{{ if .Order.CustomFields.Data.order_form_id }}{{ .Order.CustomFields.Data.order_form_id }}{{else}}{{ .Order.OrderID}}{{end}}',
          },
        ],
        response_data:
          '{"value":9500,"items":[{"id":"SKU123","quantity":2,"price":5500,"tax":200,"priceDefinition":{"total":10000,"calculatedSellingPrice":5000},"priceTags":[{"identifier":"PROMO_1","isPercentual":false,"value":-1000}]}],"totalizers":[{"id":"Items","value":10000},{"id":"Discounts","value":-1000},{"id":"Shipping","value":500},{"id":"Tax","value":200}],"paymentData":{"giftCards":[{"id":"GC-ID-XYZ","redemptionCode":"GIFTCARD123","value":500}],"payments":[{"paymentSystem":"752","value":9300,"referenceValue":9000},{"paymentSystem":"45","value":0,"referenceValue":0}]},"ratesAndBenefitsData":{"rateAndBenefitsIdentifiers":[{"id":"PROMO_1","description":"Special 10% Off Coupon","matchedParameters":{"couponCode@Marketing":"SUMMER10"}}]}}',
        ...marketingPaymentCommonFields,
      },

      syncOrderNotification: {
        event_name: 'sync_order_notification',
        http_method: 'POST',
        url: `${vtexMiddlewareUrl}/api/v1/payments/place-order`,
        headers: [
          { key: 'X-VTEX-API-AppKey', value: 'vtex-appkey-test' },
          { key: 'X-VTEX-API-AppToken', value: 'vtex-apptoken-test' },
          { key: 'X-Api-Key', value: privateKey },
        ],
        fields_update: {
          custom_fields: ['vtex_chko_auth', 'checkout_data_access'],
          fields: ['OrderID'],
        },
        response_body: {
          custom_fields: ['vtex_chko_auth', 'checkout_data_access'],
          fields: ['Order'],
        },
        payload_template:
          '{"order":{"token":"{{ .Order.Token }}","total_amount":{{ .Order.TotalAmount }},"total_interest_amount":{{ .Order.TotalInterestAmount }},"status":"{{ .Order.Status }}","currency":"{{ .Order.Currency }}"{{- if .Order.Payment }},"payment":{"data":{"status":"{{ .Order.Payment.Data.Status }}","manual_status":"{{ .Order.Payment.Data.ManualStatus }}","from_card":{"card_brand":"{{ .Order.Payment.Data.FromCard.CardBrand }}","first_six":"{{ .Order.Payment.Data.FromCard.FirstSix }}"{{- if .Order.Payment.Data.FromCard.Installment }},"installment":{"installments":{{ .Order.Payment.Data.FromCard.Installment.Installments }},"installment_rate":{{ .Order.Payment.Data.FromCard.Installment.InstallmentRate }},"installment_amount":{{ .Order.Payment.Data.FromCard.Installment.InstallmentAmount }}}{{- end }}}}}{{- end }}{{- if .Order.Fraud }},"fraud":{"analysis":{"status":"{{ .Order.Fraud.Analysis.Status }}"}}{{- end }},"gift_cards":[{{- range $index, $item := .Order.GiftCards }}{"code":"{{ $item.Code }}","reference":"{{ $item.Reference }}","description":"{{ $item.Description }}","amount":{{ $item.Amount | toInt32 }},"details_url":"{{ $item.DetailsURL }}"}{{- if ne $index (sub (len $.Order.GiftCards) 1) }},{{- end }}{{- end }}]}}',
        error_response_template: '{ "description": "{{ .error.description }}" }',
        response_data:
          '{"order":{"order_id":"100500-01","metadata":{"checkout_auth_token":"auth_token_example_12345","checkout_order_auth_token":"order_auth_token_example_67890"}}}',
        response_template:
          '{"order":{"order_id":"{{ .order.order_id }}","custom_fields":{"vtex_chko_auth":"{{ .order.metadata.checkout_auth_token }}","checkout_data_access":"{{ .order.metadata.checkout_order_auth_token }}"}}}',
      },
    };
  }

  static checkoutConfiguration(): Record<string, unknown> {
    return {
      order_config: {
        notify_type: 'sync',
        deuna_now: {
          vtex_flow_type: 'V2',
          use_master_data: true,
          promotions_strategy: null,
        },
      },
      widgets_general_config: {
        flags: { show_promotions_banner: true },
        render_3ds_strategy: 'redirect',
        theme: {},
      },
    };
  }
}
