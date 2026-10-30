import { CheckoutModuleProps } from './checkoutModuleType';

export interface CheckoutModulesForWidgetConfig {
  name: string;
  props: CheckoutModuleProps;
}

export interface Config {
  id: string;
  name: string;
  config: string;
}

export type ThemeConfig = Config[];

export interface WidgetsGeneralConfig {
  theme: any;
  flags?: any;
  checkout_modules?: CheckoutModulesForWidgetConfig[];
  render_3ds_strategy?: 'iframe' | 'redirect' | null;
  currencies?: {
    minor_units?: {
      currency: string;
      decimals: number;
    }[];
  };
  user_experience?: {
    show_saved_cards_flow?: boolean;
    init_with_guest_user?: boolean;
    user_authentication_flow?: boolean;
    disable_login?: boolean;
    /**
     * Merchant-controlled saved-card deletion. Absent keeps the legacy behavior
     * (deletion allowed); false hides every delete control; true enables them
     * and makes the widget check each card against Subscriptions.
     */
    allow_card_deletion?: boolean;
  };
}

export interface ElementsConfig {
  init_with_guest_user?: boolean;
  user_authentication_flow?: boolean;
  theme_config?: ThemeConfig;
}

export interface ThemeColors {
  primaryTextColor: string;
  backgroundSecondary: string;
  backgroundPrimary: string;
  buttonPrimaryFill: string;
  buttonPrimaryHover: string;
  buttonPrimaryText: string;
  buttonPrimaryActive: string;
  /** Fill color for interaction components: checkboxes, switches, radio buttons */
  togglePrimaryFill?: string;
  /** Fill color for progress components: progress bars, loaders */
  progressPrimaryFill?: string;
  /** Input border in its default (enabled) state */
  inputBorder?: string;
  /** Input border in its error state */
  inputBorderError?: string;
  /** Input border in its active (focused) state */
  inputEnhancerFill?: string;
  /** Input border in its success state — requires inputMode: 'validated' */
  inputBorderPositive?: string;
}

/** Input endEnhancer mode. Values are mutually exclusive. */
export type InputMode = 'validated' | 'clearable' | 'none';

export interface ThemeControls {
  borderRadius?: string;
  height?: string;
}

export interface ThemeInputs extends ThemeControls {
  inputMode?: InputMode;
}

export interface ThemeConfigContent {
  colors?: Partial<ThemeColors>;
  typography?: { primaryFontFamily?: string };
  buttons?: ThemeControls;
  inputs?: ThemeInputs;
}
