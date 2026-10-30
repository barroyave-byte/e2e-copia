import languageResources from './languageResources';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { TranslationPaymentModuleType } from './translationPaymentModuleType';

export const getTranslations = (
  module: TranslationPaymentModuleType,
  languageCode: LanguageCodes
) => {
  const simpleModule = (module: string): string => module.split('/').pop() || '';
  try {
    const moduleName = simpleModule(module);
    // Validar que el módulo exista
    const moduleTranslations = languageResources[moduleName];
    if (!moduleTranslations) {
      throw new Error(`El módulo "${moduleName}" no existe en las traducciones.`);
    }

    // Asegurar que el código de idioma esté en mayúsculas
    const normalizedLanguageCode = languageCode.toUpperCase();

    // Obtener traducciones para el idioma solicitado, con fallback a 'ES'
    const languageTranslations =
      moduleTranslations[normalizedLanguageCode] || moduleTranslations['ES'];

    if (!languageTranslations) {
      throw new Error(
        `No se encontraron traducciones para el idioma "${normalizedLanguageCode}" ni el fallback "ES".`
      );
    }

    return languageTranslations;
  } catch (error) {
    console.error(error);
    throw error; // Volver a lanzar el error si es necesario
  }
};
