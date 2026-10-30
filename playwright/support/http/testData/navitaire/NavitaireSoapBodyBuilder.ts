import { faker } from '@faker-js/faker';
import { NavitaireAuthorizeParams, NavitaireReverseParams } from '@support/http/models/navitaire';

const SOAP_NAMESPACE = 'http://skypay.navitaire.com/universal_1_0/';

export class NavitaireSoapBodyBuilder {
  static buildAuthorizeXml(params: NavitaireAuthorizeParams): string {
    const {
      username,
      password,
      paymentId,
      confirmationId,
      paymentMethod = 'CreditCardPaymentMethod',
      cardNumber = '',
      userEmail = '',
      installments = '1',
      amount = '',
      currencyCode = '',
      orderToken,
      contactEmail,
      splitPaymentSequence,
    } = params;

    const expiresAt = NavitaireSoapBodyBuilder.computeExpiresAt();
    const isoTimestamp = new Date().toISOString();

    const optionalPropertyBagItems = [
      orderToken ? `<NameValue Name="order_token" Value="${orderToken}" />` : '',
      contactEmail ? `<NameValue Name="contact_email" Value="${contactEmail}" />` : '',
      splitPaymentSequence
        ? `<NameValue Name="split_payment_sequence" Value="${splitPaymentSequence}" />`
        : '',
    ]
      .filter(Boolean)
      .map((tag) => `\t\t\t\t\t\t${tag}`)
      .join('\n');

    return `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
\t<soap:Body>
\t\t<AuthorizeRequest xmlns="${SOAP_NAMESPACE}">
\t\t\t<request Id="${faker.string.uuid()}">
\t\t\t\t<Credentials AccountLocationName="${username}"
\t\t\t\t\t\t\t AccountLocationPassword="${password}" />
\t\t\t\t<PaymentIdentification ClientPaymentId="${paymentId}"
\t\t\t\t\t\t\t\t\t   ClientProductId="${faker.string.uuid()}"
\t\t\t\t\t\t\t\t\t   ClientConfirmationId="${confirmationId}" />
\t\t\t\t<PropertyBag>
\t\t\t\t\t<Items>
\t\t\t\t\t\t<NameValue Name="SP:PAYID" Value="${faker.finance.accountNumber()}" />
\t\t\t\t\t\t<NameValue Name="DD::Installments" Value="${installments}" />
\t\t\t\t\t\t<NameValue Name="BookingIsInternational" Value="True" />
\t\t\t\t\t\t<NameValue Name="IPAddress" Value="${faker.internet.ip()}" />
\t\t\t\t\t\t<NameValue Name="NS::AgentName" Value="${faker.finance.iban()}" />
\t\t\t\t\t\t<NameValue Name="device_fingerprint" Value="${faker.string.uuid()}" />
\t\t\t\t\t\t<NameValue Name="CardHolderFirstName" Value="${faker.person.firstName()}" />
\t\t\t\t\t\t<NameValue Name="CardHolderLastName" Value="${faker.person.lastName()}" />
\t\t\t\t\t\t<NameValue Name="CC::Location" Value="CCL" />
\t\t\t\t\t\t<NameValue Name="Contact::OtherPhone" Value="${faker.phone.number()}" />
\t\t\t\t\t\t<NameValue Name="expires_at" Value="${expiresAt}" />
${optionalPropertyBagItems}
\t\t\t\t\t</Items>
\t\t\t\t</PropertyBag>
\t\t\t\t<TimeToLive />
\t\t\t\t<PaymentMethod d2p1:type="${paymentMethod}"
\t\t\t\t\t\t\t   AccountHolderName="${faker.person.fullName()}"
\t\t\t\t\t\t\t   AccountNumber="${cardNumber}"
\t\t\t\t\t\t\t   Amount="${amount}"
\t\t\t\t\t\t\t   CurrencyCode="${currencyCode}"
\t\t\t\t\t\t\t   UtcExpiration="2039-12-31T23:59:59Z"
\t\t\t\t\t\t\t   PaymentMethodSubtype="DD"
\t\t\t\t\t\t\t   xmlns:d2p1="http://www.w3.org/2001/XMLSchema-instance" />
\t\t\t\t<ProductInformation d2p1:type="AirlineItineraryInformation"
\t\t\t\t\t\t\t\t\tRecordLocator="${faker.finance.bic()}"
\t\t\t\t\t\t\t\t\tChannelType="WEB"
\t\t\t\t\t\t\t\t\tAgencyName=""
\t\t\t\t\t\t\t\t\tAgencyCode=""
\t\t\t\t\t\t\t\t\tCurrencyCode="${currencyCode}"
\t\t\t\t\t\t\t\t\tBaseFare="100.0"
\t\t\t\t\t\t\t\t\tTaxes="0"
\t\t\t\t\t\t\t\t\tFees="0"
\t\t\t\t\t\t\t\t\tRestricted="true"
\t\t\t\t\t\t\t\t\tIssueDate="${isoTimestamp}"
\t\t\t\t\t\t\t\t\txmlns:d2p1="http://www.w3.org/2001/XMLSchema-instance">
\t\t\t\t\t<Journeys>
\t\t\t\t\t\t<PaymentJourney FareBasisCode="${faker.finance.bic()}"
\t\t\t\t\t\t\t\t\t\tFareClass="Y"
\t\t\t\t\t\t\t\t\t\tCurrencyCode="${currencyCode}"
\t\t\t\t\t\t\t\t\t\tBaseFare="1.0"
\t\t\t\t\t\t\t\t\t\tTaxes="1.0"
\t\t\t\t\t\t\t\t\t\tFees="0"
\t\t\t\t\t\t\t\t\t\tForeignCurrencyCode="${currencyCode}"
\t\t\t\t\t\t\t\t\t\tForeignBaseFare="0"
\t\t\t\t\t\t\t\t\t\tForeignTaxes="0"
\t\t\t\t\t\t\t\t\t\tForeignFees="0">
\t\t\t\t\t\t\t<Segments>
\t\t\t\t\t\t\t\t<PaymentSegment DepartureAirport="EZE"
\t\t\t\t\t\t\t\t\t\t\t\tArrivalAirport="MEX"
\t\t\t\t\t\t\t\t\t\t\t\tDepartureDateTime="${isoTimestamp}"
\t\t\t\t\t\t\t\t\t\t\t\tArrivalDateTime="${isoTimestamp}"
\t\t\t\t\t\t\t\t\t\t\t\tCarrier="Y4"
\t\t\t\t\t\t\t\t\t\t\t\tFlightNumber="1234"
\t\t\t\t\t\t\t\t\t\t\t\tTicketNumber=""
\t\t\t\t\t\t\t\t\t\t\t\tOpSuffix="32" />
\t\t\t\t\t\t\t</Segments>
\t\t\t\t\t\t</PaymentJourney>
\t\t\t\t\t\t<PaymentJourney FareBasisCode="${faker.finance.bic()}"
\t\t\t\t\t\t\t\t\t\tFareClass="Q"
\t\t\t\t\t\t\t\t\t\tCurrencyCode="${currencyCode}"
\t\t\t\t\t\t\t\t\t\tBaseFare="1.00"
\t\t\t\t\t\t\t\t\t\tTaxes="1.0"
\t\t\t\t\t\t\t\t\t\tFees="0"
\t\t\t\t\t\t\t\t\t\tForeignCurrencyCode="${currencyCode}"
\t\t\t\t\t\t\t\t\t\tForeignBaseFare="0"
\t\t\t\t\t\t\t\t\t\tForeignTaxes="0"
\t\t\t\t\t\t\t\t\t\tForeignFees="0">
\t\t\t\t\t\t\t<Segments>
\t\t\t\t\t\t\t\t<PaymentSegment DepartureAirport="MEX"
\t\t\t\t\t\t\t\t\t\t\t\tArrivalAirport="EZE"
\t\t\t\t\t\t\t\t\t\t\t\tDepartureDateTime="${isoTimestamp}"
\t\t\t\t\t\t\t\t\t\t\t\tArrivalDateTime="${isoTimestamp}"
\t\t\t\t\t\t\t\t\t\t\t\tCarrier="Y4"
\t\t\t\t\t\t\t\t\t\t\t\tFlightNumber="4321"
\t\t\t\t\t\t\t\t\t\t\t\tTicketNumber=""
\t\t\t\t\t\t\t\t\t\t\t\tOpSuffix="32" />
\t\t\t\t\t\t\t</Segments>
\t\t\t\t\t\t</PaymentJourney>
\t\t\t\t\t</Journeys>
\t\t\t\t\t<PassengerNames>
\t\t\t\t\t\t<Name Title="${faker.person.prefix()}"
\t\t\t\t\t\t\t  FirstName="${faker.person.firstName()}"
\t\t\t\t\t\t\t  MiddleName=""
\t\t\t\t\t\t\t  LastName="${faker.person.lastName()}"
\t\t\t\t\t\t\t  Suffix="${faker.person.suffix()}" />
\t\t\t\t\t\t<Name Title="${faker.person.prefix()}"
\t\t\t\t\t\t\t  FirstName="${faker.person.firstName()}"
\t\t\t\t\t\t\t  MiddleName=""
\t\t\t\t\t\t\t  LastName="${faker.person.lastName()}"
\t\t\t\t\t\t\t  Suffix="${faker.person.suffix()}" />
\t\t\t\t\t</PassengerNames>
\t\t\t\t\t<ContactNames>
\t\t\t\t\t\t<Name Title="${faker.person.prefix()}"
\t\t\t\t\t\t\t  FirstName="${faker.person.firstName()}"
\t\t\t\t\t\t\t  MiddleName=""
\t\t\t\t\t\t\t  LastName="${faker.person.lastName()}"
\t\t\t\t\t\t\t  Suffix="${faker.person.suffix()}" />
\t\t\t\t\t</ContactNames>
\t\t\t\t\t<FrequentFlierNumbers>
\t\t\t\t\t\t<string>${faker.finance.iban()}</string>
\t\t\t\t\t</FrequentFlierNumbers>
\t\t\t\t</ProductInformation>
\t\t\t\t<SecurityProperties>
\t\t\t\t\t<BillToAddress>
\t\t\t\t\t\t<City>${faker.location.city()}</City>
\t\t\t\t\t\t<Country>MX</Country>
\t\t\t\t\t\t<FirstName>${faker.person.firstName()}</FirstName>
\t\t\t\t\t\t<LastName>${faker.person.lastName()}</LastName>
\t\t\t\t\t\t<PostalCode>50100</PostalCode>
\t\t\t\t\t\t<State>DF</State>
\t\t\t\t\t\t<Street1>${faker.location.streetAddress()}</Street1>
\t\t\t\t\t\t<Street2>${faker.location.street()}</Street2>
\t\t\t\t\t\t<Street3 />
\t\t\t\t\t</BillToAddress>
\t\t\t\t\t<SecurityCode>123</SecurityCode>
\t\t\t\t\t<CustomerEmailAddress>${userEmail}</CustomerEmailAddress>
\t\t\t\t</SecurityProperties>
\t\t\t</request>
\t\t</AuthorizeRequest>
\t</soap:Body>
</soap:Envelope>`;
  }

  static buildReverseXml(params: NavitaireReverseParams): string {
    const {
      username,
      password,
      paymentId,
      confirmationId,
      originalPaymentId,
      refundAmount = '100.0',
    } = params;

    return `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
\t<soap:Body>
\t\t<ReverseRequest xmlns="${SOAP_NAMESPACE}">
\t\t\t<request Id="${faker.string.uuid()}">
\t\t\t\t<Credentials AccountLocationName="${username}"
\t\t\t\t\t\t\t AccountLocationPassword="${password}" />
\t\t\t\t<PaymentIdentification ClientPaymentId="${paymentId}"
\t\t\t\t\t\t\t\t\t   ClientProductId="${faker.string.uuid()}"
\t\t\t\t\t\t\t\t\t   ClientConfirmationId="${confirmationId}" />
\t\t\t\t<PaymentToReverse ClientPaymentId="${originalPaymentId}" />
\t\t\t\t<PaymentMethod xmlns:d2p1="http://www.w3.org/2001/XMLSchema-instance"
\t\t\t\t\t\t\t   d2p1:type="CreditCardPaymentMethod"
\t\t\t\t\t\t\t   Amount="${refundAmount}"
\t\t\t\t\t\t\t   CurrencyCode="MXN"
\t\t\t\t\t\t\t   UtcExpiration="2030-12-31T23:59:59Z" />
\t\t\t\t<PropertyBag>
\t\t\t\t\t<Items />
\t\t\t\t</PropertyBag>
\t\t\t\t<TimeToLive />
\t\t\t\t<ProductInformation xmlns:d2p1="http://www.w3.org/2001/XMLSchema-instance"
\t\t\t\t\t\t\t\t\td2p1:type="AirlineItineraryInformation" />
\t\t\t\t<SecurityProperties>
\t\t\t\t\t<BillToAddress />
\t\t\t\t</SecurityProperties>
\t\t\t</request>
\t\t</ReverseRequest>
\t</soap:Body>
</soap:Envelope>`;
  }

  static computeExpiresAt(): string {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 5);
    expiresAt.setMilliseconds(0);
    return expiresAt.toISOString();
  }
}
