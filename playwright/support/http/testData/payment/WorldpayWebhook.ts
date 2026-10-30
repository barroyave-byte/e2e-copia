export interface WorldpayWebhookParams {
  merchantId: string;
  externalTxId: string;
  paymentStatus?: string;
  amount?: string;
  currencyCode?: string;
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
}

const DEFAULT_PARAMS: Required<Omit<WorldpayWebhookParams, 'merchantId' | 'externalTxId'>> = {
  paymentStatus: 'AUTHORISED',
  amount: '2400',
  currencyCode: 'EUR',
  cardNumber: '444433****1111',
  expiryMonth: '01',
  expiryYear: '2020',
};

export const buildWorldpayWebhookXml = (params: WorldpayWebhookParams): string => {
  const {
    merchantId,
    externalTxId,
    paymentStatus = DEFAULT_PARAMS.paymentStatus,
    amount = DEFAULT_PARAMS.amount,
    currencyCode = DEFAULT_PARAMS.currencyCode,
    cardNumber = DEFAULT_PARAMS.cardNumber,
    expiryMonth = DEFAULT_PARAMS.expiryMonth,
    expiryYear = DEFAULT_PARAMS.expiryYear,
  } = params;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE paymentService PUBLIC "-//Worldpay//DTD Worldpay PaymentService v1//EN" "http://dtd.worldpay.com/paymentService_v1.dtd">
<paymentService version="1.4" merchantCode="${merchantId}">
    <notify>
        <orderStatusEvent orderCode="${externalTxId}">
            <payment>
                <paymentMethod>VISA_CREDIT-SSL</paymentMethod>
                <paymentMethodDetail>
                    <card number="${cardNumber}" type="creditcard">
                        <expiryDate>
                            <date month="${expiryMonth}" year="${expiryYear}"/>
                        </expiryDate>
                    </card>
                </paymentMethodDetail>
                <amount value="${amount}" currencyCode="${currencyCode}" exponent="2" debitCreditIndicator="credit"/>
                <lastEvent>${paymentStatus}</lastEvent>
                <AuthorisationId id="622206"/>
                <CVCResultCode description="C"/>
                <AVSResultCode description="E"/>
                <cardHolderName>*</cardHolderName>
                <issuerCountryCode>N/A</issuerCountryCode>
                <cardNumber>${cardNumber}</cardNumber>
                <riskScore value="0"/>
            </payment>
            <journal journalType="AUTHORISED" sent="n">
                <bookingDate>
                    <date dayOfMonth="01" month="01" year="2020"/>
                </bookingDate>
                <accountTx accountType="IN_PROCESS_AUTHORISED" batchId="30">
                    <amount debitCreditIndicator="credit" exponent="2" currencyCode="${currencyCode}" value="${amount}"/>
                </accountTx>
            </journal>
        </orderStatusEvent>
    </notify>
</paymentService>`;
};
