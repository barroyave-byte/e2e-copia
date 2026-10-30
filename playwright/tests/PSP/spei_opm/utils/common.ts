export function getSpeiOpmWebhookBody(externalId: string, amount: number, transactionType: string){
    if (transactionType === 'purchase') {
        return {
            "data": {
                "sign": "ejxxu44ByH6HdCnqvIxT2TvXCIsvY3NHNR31Znf/6PmRHSM4nh0lppRPLlpOHMU0BYud0u99oV",
                "amount": amount,
                "concept": "TEST",
                "payerUid": "ABCD900824B52",
                "payerBank": "97884",
                "payerName": "GEMTRANSFER",
                "trackingKey": "MBAN01002111030095198330",
                "payerAccount": "884180884987878785",
                "operationDate": "2021-12-30",
                "beneficiaryUid": "WOWN9907552B5",
                "beneficiaryBank": "684",
                "beneficiaryName": "De Una",
                "payerAccountType": 40,
                "receivedTimestamp": 1640880657000,
                "beneficiaryAccount": externalId,
                "numericalReference": 211210,
                "beneficiaryAccountType": 40
            },
            "type": "supply"
        }
    }else{
        return {
            "data": {
                "id": externalId,
                "status": "scattered"
            },
            "sign": "",
            "type": "orderStatus"
        }
    }

}
