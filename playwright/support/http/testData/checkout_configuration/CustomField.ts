import { CreateCustomFieldData } from "@support/http/models/checkoutConfiguration";

export const bodyCustomFieldTip: CreateCustomFieldData = {
    field_name: "tip_amount",
    placeholder: "Propina",
    field_type: "integer",
    validation: {
        required: false,
        maximum: 2000,
        exclusive_minimum: 0
    },
}

export const bodyCustomFieldCountries: CreateCustomFieldData = {
    field_name: "countries",
    placeholder: "Paises",
    field_type: "multiselect",
    items_enum: ["col", "mex", "ecu", "chl", "per"],
    validation: {
        required: false,
        min_items: 2,
        depends_on: "tipAmount"
    },

}