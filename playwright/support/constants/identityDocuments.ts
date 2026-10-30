/**
 * Valid identity document examples by country and document type.
 *
 * Structure: IDENTITY_DOCUMENTS[CountryCode][DocumentType] = 'example_value'
 *
 * Use these in tests that require `identity_document` and `identity_document_type` fields.
 *
 * @example
 * identity_document: IDENTITY_DOCUMENTS.MX.RFC,
 * identity_document_type: 'RFC',
 */
export const IDENTITY_DOCUMENTS = {
  MX: {
    RFC: 'GODE561231GR8', // Registro Federal de Contribuyentes – persona física
    RFC_GENERICO: 'XAXX010101000', // RFC genérico para ventas sin destinatario
  },
  CO: {
    CC: '1234567890', // Cédula de Ciudadanía
    CE: '123456789', // Cédula de Extranjería
    NIT: '900123456-7', // Número de Identificación Tributaria
    PP: 'AB123456', // Pasaporte
  },
  BR: {
    CPF: '52998224725', // Cadastro de Pessoa Física (válido)
    CNPJ: '11222333000181', // Cadastro Nacional da Pessoa Jurídica
  },
  CL: {
    RUT: '12.345.678-5', // Rol Único Tributario – persona natural
    RUT_EMPRESA: '76354771-K', // Rol Único Tributario – empresa
  },
  EC: {
    CI: '1234567890', // Cédula de Identidad (10 dígitos)
    RUC: '1234567890001', // Registro Único de Contribuyentes (13 dígitos)
    PP: 'A1234567', // Pasaporte
  },
  AR: {
    DNI: '12345678', // Documento Nacional de Identidad
    CUIT: '20-12345678-9', // Clave Única de Identificación Tributaria
    CUIL: '20-12345678-9', // Código Único de Identificación Laboral
  },
  PE: {
    DNI: '12345678', // Documento Nacional de Identidad (8 dígitos)
    CE: '000123456', // Carnet de Extranjería
    RUC: '10123456789', // Registro Único de Contribuyentes (11 dígitos)
    PP: 'AB123456', // Pasaporte
  },
  CR: {
    CI: '102340567', // Cédula de Identidad (8 dígitos)
  },
  HN: {
    DNI: '0801199512345', // Tarjeta de Identidad Honduras (9 dígitos)
  },
  UY: {
    CI: '41234567', // Cédula de Identidad Uruguay (formato ebanx)
  },
  ES: {
    DNI: '12345678Z', // Documento Nacional de Identidad (mod-23 check digit)
    NIF: '12345678Z', // Número de Identificación Fiscal (same format as DNI)
    NIE: 'X1234567L', // Número de Identidad de Extranjero (X/Y/Z + 7 digits + mod-23)
    CIF: 'B12345674', // Código de Identificación Fiscal – digit control
    PP: 'ABC12345',  // Pasaporte
  }
} as const;

export type IdentityDocumentCountry = keyof typeof IDENTITY_DOCUMENTS;
export type IdentityDocumentType<C extends IdentityDocumentCountry> =
  keyof (typeof IDENTITY_DOCUMENTS)[C];

/**
 * Default identity document value per country, used by fillCreditCardDataDeunaNow
 * when the `country` option is provided.
 */
export const DEFAULT_DOCUMENT_BY_COUNTRY: Readonly<Record<string, string>> = {
  MX: IDENTITY_DOCUMENTS.MX.RFC,
  CO: IDENTITY_DOCUMENTS.CO.CC,
  BR: IDENTITY_DOCUMENTS.BR.CPF,
  CL: IDENTITY_DOCUMENTS.CL.RUT,
  EC: IDENTITY_DOCUMENTS.EC.CI,
  AR: IDENTITY_DOCUMENTS.AR.DNI,
  PE: IDENTITY_DOCUMENTS.PE.DNI,
  CR: IDENTITY_DOCUMENTS.CR.CI,
  HN: IDENTITY_DOCUMENTS.HN.DNI,
  UY: IDENTITY_DOCUMENTS.UY.CI,
  ES: IDENTITY_DOCUMENTS.ES.NIF
};
