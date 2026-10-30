export interface FraudProcessorData {
    merchant_profile: {
        merchant_id: string,
        name: string,
        processor_id: number
    },
    credentials: {
        metadata_id: number,
        value: string
    }[]
}

export interface FraudProcessorResponse {
    merchant_id: string,
    profile: {
        anti_fraud_provider: [
            {   
              provider_id: string,
              provider_name: string,
              enabled: boolean,
              last_update: string,
              credentials: [
                {
                  property_name: string,
                  value: string,
                  label: string
                },
                {
                  property_name: string,
                  value: string,
                  label: string
                }
              ]
            }
          ],
          manual_review_configuration: {
            manual_review: boolean,
            execute_endpoints: boolean
          },
          fulfillments: boolean,
          shadow_mode: boolean
        }
}

