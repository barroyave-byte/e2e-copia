type PreloadWidgetType = 'payment' | 'elements';

type WidgetMode = 'modal' | 'target';

type WidgetLanguage = 'es' | 'pt' | 'en';

interface PreloadWidget {
  widget: PreloadWidgetType;
  params: Record<string, unknown>;
}

export interface WebSDKInitConfig {
  env?: string;
  publicApiKey: string;
  preloadWidgets?: PreloadWidget[];
};

export interface WebSDKWidgetConfig extends Record<string, unknown> {
  mode?: WidgetMode;
  target?: string;
  domain?: string;
  language?: 'es' | 'en' | 'pt';
  userToken?: string;
  orderToken?: string;
  styleFile?: string;
  hidePayButton?: boolean;
  fraudCredentials?: Record<string, unknown>;
  callbacks?: Record<string, (params: unknown) => void>
};

export type WebSDKResponse = Promise<unknown>;
