import { MerchantRoutingData, ProcessorRoutingData, StoreRoutingData } from "@support/http/models/paymentRouting";

export const BODY_MERCHANT_ROUTING_DEFAULT: MerchantRoutingData = {
    id: 'merchant_id',
    description: 'AUTOMATION_MERCHANT996',
    is_active: true
}

export const BODY_PROCESSOR_STRIPE_ROUTING_DEFAULT: ProcessorRoutingData = {
    processor_id: 10,
    code: 'STRIPE_DIRECT',
    is_active: true
}

export const BODY_PROCESSOR_CONEKTA_ROUTING_DEFAULT: ProcessorRoutingData = {
    processor_id: 1,
    code: 'CONEKTA',
    is_active: true
}

export const BODY_PROCESSOR_CONEKTA_CREDIT_ROUTING_DEFAULT: ProcessorRoutingData = {
    processor_id: 13,
    code: 'CONEKTA_CREDIT',
    is_active: true
}

export const BODY_PROCESSOR_KUSHKI_ROUTING_DEFAULT: ProcessorRoutingData = {
    processor_id: 4,
    code: 'KUSHKI',
    is_active: true
}

export const buildStoreRoutingDefault = (processorQuantity: string): StoreRoutingData => {
    const baseSettings = [
        { processor_code: 'STRIPE_DIRECT' },
    ];

    const kushkiSettings = [
        { processor_code: 'KUSHKI' }
    ];

    const conektaSettings = [
        { processor_code: 'CONEKTA' }
    ];

    const settings = processorQuantity === '2' 
        ? [...baseSettings, ...kushkiSettings] 
        : processorQuantity === '3' 
            ? [...baseSettings, ...conektaSettings, ...kushkiSettings]
            : baseSettings;

    return {
        store_code: 'all',
        algorithm_type: 'cascading',
        country: 'MX',
        is_active: true,
        settings
    };
};

export const BODY_STORE_ROUTING_DEFAULT: StoreRoutingData = buildStoreRoutingDefault('3');

    