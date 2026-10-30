export enum TranslationsEnvironment {
  DEV = 'dev',
  STG = 'stg',
  PROD = 'prod',
}

export enum EditorMode {
  JSON = 'json',
  CHUNKS = 'chunks',
  HISTORY = 'history',
}

export interface LoginOptions {
  env: TranslationsEnvironment;
  email: string;
  password: string;
}

export interface NewTranslationsProjectOptions {
  name: string;
  lang: string;
  defaultJson?: Record<string, unknown>;
}

export interface NewChunkOptions {
  name: string;
  translations: Record<string, string>;
}
