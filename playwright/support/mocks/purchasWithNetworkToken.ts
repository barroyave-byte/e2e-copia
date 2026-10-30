export const mock_purchase_token = {
  specific_fields: {
    google_pay: {
      paymentData: {
        apiVersion: 2,
        apiVersionMinor: 0,
        paymentMethodData: {
          description: 'Visa •••• 4655',
          info: {
            assuranceDetails: {
              accountVerified: true,
              cardHolderAuthenticated: false,
            },
            cardDetails: '4655',
            cardNetwork: 'VISA',
          },
          tokenizationData: {
            token:
              '{"signature":"MEUCIQCa3/MQjdxoe7utgfgWZnrulgmKvo/F/R1uxzpZT9dmcAIgV6rEj6sP0kcrTXkFVes0y+gOqEzyuF0zeKx5Jf1bLik\\u003d","intermediateSigningKey":{"signedKey":"{\\"keyValue\\":\\"MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEXp0JACNGafbtGruab7RbEklA3LM4ZUDe7kTa+cjDX+hifT5t2VRFBcFcIn2YCB3M+4eS04zMifW7hq5/XydxOw\\\\u003d\\\\u003d\\",\\"keyExpiration\\":\\"1723827876916\\"}","signatures":["MEUCICWB51YM8D0ivXmbleeidAcMwP+ZswFIw1kuIua92JqjAiEA8S50sN2UgXzoxAzt046LZhA8QGnZYdaWVeK+GPbMuLU\\u003d"]},"protocolVersion":"ECv2","signedMessage":"{\\"encryptedMessage\\":\\"AVUUo9/gfyw1vLSVrheTf10t6CFogEPjdcU9afgYuD/jTNZeaOV2WGg0QEvltNDudKMVhG4y1pbCe5k2KA7tfqFFjal79gtR713quO93xOhs93RTlm+NPboOGcdzYC1l5Ld5R9nwoeUtWYF8q2BwKyAcv1baydubuJbdOQPP0GpLrnTu1sepzUnETNydAJ6sQ77Hnzm4ph4hLo9489m8vvej+726TrgSycm062k06EfR5fW6X5t2YMykybx9J4RV+X1Xp6QAYvBLWBT0H3jsjJ5o2ScnQlY/usrfa7sT4Fz6hQTgHjccLRCLjhcDfM7d4J7+3yyvkOCKjkihNGu1cfcyPu+/tdhzV2FnhWnH3jS6epQ2XHUq7zssbEnPD9HKQDA38v4lpYDR+JKLNfoA9UbwIHCu/PV788avvR3NRLeneWR3FEXe3Ou3shbCzmgWkw5UeKymTvzJSoqsFp8bBLxXE9LwkkOgh6NwdX3c32Woyx33kqyn0NIk4k5a\\",\\"ephemeralPublicKey\\":\\"BJNbQkQx0OswV1qKvVld0rvg5yDtNElVGNrF6ansg3/sNGucn+sLYpj2A8bJprh/mKbkLjAdGMDWUvpS/0qkJG4\\\\u003d\\",\\"tag\\":\\"KtMHoratMOHwsD+nT/PqTsNdu7NeItdPFs0OrshW88w\\\\u003d\\"}"}',
            type: 'DIRECT',
          },
          type: 'CARD',
        },
      },
    },
  },
  "credit_card": {
    "card_cvv": "123",
    "expiry_month": "11",
    "expiry_year": "2025",
    "card_holder": "Jose Perez",
    "card_holder_dni": "185396924",
    "card_holder_dni_type": "",
    "card_number": "4242424242424242",
    "address1": "Av. Eloy Alfaro 20, Quito 170515, Ecuador BILLING Purchase",
    "zip": "17051",
    "city": "CMX",
    "state": "CRT",
    "country": "CO",
    "phone": "59 3986100449",
    "installments": 0,
    "installment": {
      "plan_option_id": "00000000-0000-0000-0000-000000000000"
    }
  },
};
