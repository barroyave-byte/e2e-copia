import { BaseProcessor } from './baseProcessor';

interface PrismaPaywayProcessor extends BaseProcessor {
  allow_installments: boolean;
  tokenize_with_gateway?: boolean;
}

const prismaPaywayProcessor: PrismaPaywayProcessor = {
  name: 'Prisma_payway',
  payment_processor_id: 91,
  enabled: true,
  currency_iso3: 'ARS',
  country_iso: 'AR',
  private_api_key: 'KSlGjf8bAoClBBlMbkQfNXiCnetpoZYg',
  allow_installments: true,
};


const prismaPaywayProcessor2: PrismaPaywayProcessor = {
  ...prismaPaywayProcessor,
  name: 'prisma_payway_2',
};

const prismaPaywayProcessorAuthorize: PrismaPaywayProcessor = {
  ...prismaPaywayProcessor,
  private_api_key: 'mxF3cVpInlm9WIQRsiAjw4PnQ9cUcgD5',
  automatic_capture: false,
};

const prismaPaywayProcessorTokenization: PrismaPaywayProcessor = {
  ...prismaPaywayProcessor,
  tokenize_with_gateway: true,
};

const prismaPaywayProcessorAirline: PrismaPaywayProcessor = {
  ...prismaPaywayProcessor,
  private_api_key: 'ypBKJDVAPMJuNxsm01YagoRRFbR7aAQj',
  external_merchant_id: '00171024',
};

const prismaPaywayProcessorAirlineAgency: PrismaPaywayProcessor = {
  ...prismaPaywayProcessor,
  private_api_key: 'ypBKJDVAPMJuNxsm01YagoRRFbR7aAQj',
  external_merchant_id: '00161024',
  extra_params: {
    is_airline_site: true,
  },
};

export {
  prismaPaywayProcessor,
  prismaPaywayProcessorAuthorize,
  prismaPaywayProcessorTokenization,
  prismaPaywayProcessorAirline,
  prismaPaywayProcessorAirlineAgency,
  prismaPaywayProcessor2,
};
