export interface CheckoutModule {
  name: string;
  props?: CheckoutModuleProps;
}

export interface CheckoutModuleProps {
  show_in_main_view?: boolean;
  hide_product_image?: boolean;
  fields?: CheckoutModuleField[];
}

export interface CheckoutModuleField {
  name: string;
  validation?: CheckoutModuleValidation;
  supportedDocumentTypes?: Record<string, string[]>;
  disableDocumentMask?: boolean;
}

export interface CheckoutModuleValidation {
  required: boolean;
}
