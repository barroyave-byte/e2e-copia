import { EmailGenerator } from '@support/utils/EmailGenerator';
import { faker } from '@faker-js/faker';
import {
  SabreAuthorizeParams,
  SabreCancelOrRefundParams,
  SabreCaptureParams,
} from '@support/http/models/sabre';

/**
 * A person name already in the form the middleware stores it: first letter up, the rest down,
 * letters only. A raw faker name such as "O'Connell" came back as "O'connell" in the transaction
 * visibility trace and failed the exact passenger match in PLAT-T1591.
 */
const personName = (generate: () => string): string => {
  const letters = generate()
    .replace(/[^A-Za-z]/g, '')
    .toLowerCase();
  return letters.charAt(0).toUpperCase() + letters.slice(1);
};

const DEFAULT_DOC_TYPE = 'TKT';
const DEFAULT_DOC_NUMBER = '00000000000000';

export class SabreSoapBodyBuilder {
  static buildAuthorizeXml(params: SabreAuthorizeParams): string {
    const {
      merchantAccountCode,
      username,
      password,
      cardNumber = '',
      paymentMethodCode,
      installments,
      amount,
      currencyCode,
      countryCode,
      stateCode,
    } = params;

    const isoTimestamp = new Date().toISOString();

    return `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
\t\t\t   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
\t\t\t   xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
\t<soap:Header xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
\t\t<wsse:Security soap:mustUnderstand="1">
\t\t\t<wsse:UsernameToken>
\t\t\t\t<wsse:Username>${username}</wsse:Username>
\t\t\t\t<wsse:Password>${password}</wsse:Password>
\t\t\t</wsse:UsernameToken>
\t\t</wsse:Security>
\t</soap:Header>
\t<soap:Body>
\t\t<AuthRQ xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
\t\t\t\tVersion="2.8"
                RequestID="${faker.string.uuid()}"
\t\t\t\tMerchantAccountCode="${merchantAccountCode}">
\t\t\t<PaymentDetail>
\t\t\t\t<PaymentMethod PaymentMethodCode="${paymentMethodCode}" />
\t\t\t\t<PaymentCard CardNumber="${cardNumber}"
\t\t\t\t\t\t\t CVC="123"
\t\t\t\t\t\t\t ExpireDate="122030"
\t\t\t\t\t\t\t CardHolderName="${faker.person.fullName()}" />
\t\t\t\t<InstallmentDetail NumberOfInstallments="${installments}"
\t\t\t\t\t\t\t\t   PromotionalInd="true" />
\t\t\t\t<BillingAddress>
\t\t\t\t\t<AddressLine1>${faker.location.streetAddress()}</AddressLine1>
\t\t\t\t\t<AddressLine2>${faker.location.street()}</AddressLine2>
\t\t\t\t\t<CityName>${faker.location.city()}</CityName>
\t\t\t\t\t<PostalCode>${faker.string.numeric(5)}</PostalCode>
\t\t\t\t\t<StateProv StateCode="${stateCode}" />
\t\t\t\t\t<Country Code="${countryCode}" />
\t\t\t\t</BillingAddress>
\t\t\t\t<AmountDetail Amount="${amount}"
\t\t\t\t\t\t\t  CurrencyCode="${currencyCode}" />
\t\t\t</PaymentDetail>
\t\t\t<CustomerDetail FirstName="${personName(faker.person.firstName)}"
\t\t\t\t\t\t\tLastName="${personName(faker.person.lastName)}"
\t\t\t\t\t\t\tDOB="1969-04-20"
\t\t\t\t\t\t\tGender="M">
\t\t\t\t<EmailAddress>${EmailGenerator.generatePayerEmail()}</EmailAddress>
\t\t\t\t<PhoneNumber Number="${faker.phone.number()}"
\t\t\t\t\t\t\t Type="M" />
\t\t\t</CustomerDetail>
\t\t\t<OrderDetail OrderNumber="${faker.finance.accountNumber()}${faker.finance.accountNumber()}"
\t\t\t\t\t\t RecordLocator="${faker.location.countryCode()}${faker.string.alphanumeric(8).toUpperCase()}">
\t\t\t\t<ProductDetail ProductSummaryIndicator="2">
\t\t\t\t\t<ProductDetailItems>
\t\t\t\t\t\t<ProductDetailItem ProductID="0001"
\t\t\t\t\t\t\t\t\t\t   ProductName="${faker.commerce.productName()}" />
\t\t\t\t\t\t<ProductDetailItem ProductID="0002"
\t\t\t\t\t\t\t\t\t\t   ProductName="${faker.commerce.productName()}" />
\t\t\t\t\t</ProductDetailItems>
\t\t\t\t</ProductDetail>
\t\t\t\t<PassengerDetail NameInPNR="${faker.person.prefix()}"
\t\t\t\t\t\t\t\t FirstName="${personName(faker.person.firstName)}"
\t\t\t\t\t\t\t\t LastName="${personName(faker.person.lastName)}"
\t\t\t\t\t\t\t\t PsgrType="ADT"
\t\t\t\t\t\t\t\t Gender="M">
\t\t\t\t\t<Document DocType="TKT"
\t\t\t\t\t\t\t  DocNumber="${faker.finance.accountNumber()}" />
\t\t\t\t</PassengerDetail>
\t\t\t\t<PassengerDetail NameInPNR="${faker.person.prefix()}"
\t\t\t\t\t\t\t\t FirstName="${personName(faker.person.firstName)}"
\t\t\t\t\t\t\t\t LastName="${personName(faker.person.lastName)}"
\t\t\t\t\t\t\t\t PsgrType="ADT"
\t\t\t\t\t\t\t\t Gender="F">
\t\t\t\t\t<Document DocType="TKT"
\t\t\t\t\t\t\t  DocNumber="${faker.finance.accountNumber()}" />
\t\t\t\t</PassengerDetail>
\t\t\t\t<FlightDetail>
\t\t\t\t\t<AirlineCode>AA</AirlineCode>
\t\t\t\t\t<FlightNumber>12</FlightNumber>
\t\t\t\t\t<ClassOfService>F</ClassOfService>
\t\t\t\t\t<DepartureInfo DepartureAirport="DFW"
\t\t\t\t\t\t\t\t   DepartureDateTime="${isoTimestamp}" />
\t\t\t\t\t<ArrivalInfo ArrivalAirport="LAX"
\t\t\t\t\t\t\t\t ArrivalDateTime="${isoTimestamp}" />
\t\t\t\t</FlightDetail>
\t\t\t\t<FlightDetail ReturnFlightInd="true">
\t\t\t\t\t<AirlineCode>AA</AirlineCode>
\t\t\t\t\t<FlightNumber>147</FlightNumber>
\t\t\t\t\t<ClassOfService>F</ClassOfService>
\t\t\t\t\t<DepartureInfo DepartureAirport="LAX"
\t\t\t\t\t\t\t\t   DepartureDateTime="${isoTimestamp}" />
\t\t\t\t\t<ArrivalInfo ArrivalAirport="DFW"
\t\t\t\t\t\t\t\t ArrivalDateTime="${isoTimestamp}" />
\t\t\t\t</FlightDetail>
\t\t\t</OrderDetail>
\t\t\t<POS CountryCode="US"
\t\t\t\t ChannelID="WEB"
\t\t\t\t IP_Address="${faker.internet.ip()}">
\t\t\t\t<BrowserDetail>
\t\t\t\t\t<BrowserJavaEnabled>true</BrowserJavaEnabled>
\t\t\t\t\t<BrowserJavaScriptEnabled>true</BrowserJavaScriptEnabled>
\t\t\t\t\t<BrowserScreenColorDepth>${faker.number.int({ min: 16, max: 32 })}</BrowserScreenColorDepth>
\t\t\t\t\t<BrowserScreenHeight>${faker.number.int({ min: 600, max: 2160 })}</BrowserScreenHeight>
\t\t\t\t\t<BrowserScreenWidth>${faker.number.int({ min: 800, max: 3840 })}</BrowserScreenWidth>
\t\t\t\t\t<BrowserTimeZoneOffset>5:00</BrowserTimeZoneOffset>
\t\t\t\t\t<ChallengeWindowSize>03</ChallengeWindowSize>
\t\t\t\t\t<HttpHeaders>
\t\t\t\t\t\t<HttpHeader Name="content-length">${faker.number.int({ min: 100, max: 9999 })}</HttpHeader>
\t\t\t\t\t\t<HttpHeader Name="user-agent">${faker.internet.userAgent()}</HttpHeader>
\t\t\t\t\t\t<HttpHeader Name="connection">keep-alive</HttpHeader>
\t\t\t\t\t\t<HttpHeader Name="cache-control">max-age=0</HttpHeader>
\t\t\t\t\t\t<HttpHeader Name="accept">text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8</HttpHeader>
\t\t\t\t\t\t<HttpHeader Name="content-type">application/x-www-form-urlencoded</HttpHeader>
\t\t\t\t\t\t<HttpHeader Name="accept-encoding">gzip,deflate</HttpHeader>
\t\t\t\t\t\t<HttpHeader Name="accept-language">en-US,en;q=0.8,de;q=0.6</HttpHeader>
\t\t\t\t\t</HttpHeaders>
\t\t\t\t</BrowserDetail>
\t\t\t</POS>
\t\t</AuthRQ>
\t</soap:Body>
</soap:Envelope>`;
  }

  static buildCaptureXml(params: SabreCaptureParams): string {
    const {
      merchantAccountCode,
      username,
      password,
      transactionId,
      amount,
      currencyCode,
      passenger,
    } = params;

    const isoTimestamp = new Date().toISOString();

    return `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
\t\t\t   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
\t\t\t   xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
\t<soap:Header xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
\t\t<wsse:Security soap:mustUnderstand="1">
\t\t\t<wsse:UsernameToken>
\t\t\t\t<wsse:Username>${username}</wsse:Username>
\t\t\t\t<wsse:Password>${password}</wsse:Password>
\t\t\t</wsse:UsernameToken>
\t\t</wsse:Security>
\t</soap:Header>
\t<soap:Body>
\t\t<CaptureRQ Version="2.8"
\t\t\t\t   RequestID="${faker.string.uuid()}"
\t\t\t\t   MerchantAccountCode="${merchantAccountCode}">
\t\t\t<OriginalTransaction TransactionID="${transactionId}" />
\t\t\t<CaptureDetail>
\t\t\t\t<CaptureAmount Amount="${amount}"
\t\t\t\t\t\t\t   CurrencyCode="${currencyCode}" />
\t\t\t\t<PassengerDetail NameInPNR="${passenger.nameInPnr}"
\t\t\t\t\t\t\t\t FirstName="${passenger.firstName}"
\t\t\t\t\t\t\t\t LastName="${passenger.lastName}"
\t\t\t\t\t\t\t\t PsgrType="${passenger.type}"
\t\t\t\t\t\t\t\t Gender="${passenger.gender}">
\t\t\t\t\t<Document DocType="${passenger.docType}"
\t\t\t\t\t\t\t  DocNumber="${passenger.docNumber}" />
\t\t\t\t</PassengerDetail>
\t\t\t\t<FlightDetail>
\t\t\t\t\t<AirlineCode>AA</AirlineCode>
\t\t\t\t\t<FlightNumber>12</FlightNumber>
\t\t\t\t\t<ClassOfService>F</ClassOfService>
\t\t\t\t\t<DepartureInfo DepartureAirport="DFW"
\t\t\t\t\t\t\t\t   DepartureDateTime="${isoTimestamp}" />
\t\t\t\t\t<ArrivalInfo ArrivalAirport="LAX"
\t\t\t\t\t\t\t\t ArrivalDateTime="${isoTimestamp}" />
\t\t\t\t</FlightDetail>
\t\t\t\t<FlightDetail ReturnFlightInd="true">
\t\t\t\t\t<AirlineCode>AA</AirlineCode>
\t\t\t\t\t<FlightNumber>147</FlightNumber>
\t\t\t\t\t<ClassOfService>F</ClassOfService>
\t\t\t\t\t<DepartureInfo DepartureAirport="LAX"
\t\t\t\t\t\t\t\t   DepartureDateTime="${isoTimestamp}" />
\t\t\t\t\t<ArrivalInfo ArrivalAirport="DFW"
\t\t\t\t\t\t\t\t ArrivalDateTime="${isoTimestamp}" />
\t\t\t\t</FlightDetail>
\t\t\t</CaptureDetail>
\t\t</CaptureRQ>
\t</soap:Body>
</soap:Envelope>`;
  }

  static buildCancelOrRefundXml(params: SabreCancelOrRefundParams): string {
    const {
      merchantAccountCode,
      username,
      password,
      transactionId,
      amount,
      currencyCode,
      passenger,
    } = params;

    const docType = passenger?.docType ?? DEFAULT_DOC_TYPE;
    const docNumber = passenger?.docNumber ?? DEFAULT_DOC_NUMBER;

    return `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
\t\t\t   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
\t\t\t   xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Header xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
        <wsse:Security soap:mustUnderstand="1">
            <wsse:UsernameToken>
                <wsse:Username>${username}</wsse:Username>
                <wsse:Password>${password}</wsse:Password>
            </wsse:UsernameToken>
        </wsse:Security>
    </soap:Header>
    <soap:Body>
        <CancelOrRefundRQ xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
\t\t\t\t  Version="2.8"
\t\t\t\t  MerchantAccountCode="${merchantAccountCode}"
\t\t\t\t  RequestID="${faker.string.uuid()}">
            <OriginalTransaction TransactionID="${transactionId}" />
            <AmountDetail Amount="${amount}"
\t\t\t\t  CurrencyCode="${currencyCode}" />
            <RefundDetail>
                <Documents>
                    <Document DocType="${docType}"
\t\t\t\t\t  DocNumber="${docNumber}" />
                </Documents>
            </RefundDetail>
        </CancelOrRefundRQ>
    </soap:Body>
</soap:Envelope>`;
  }
}
