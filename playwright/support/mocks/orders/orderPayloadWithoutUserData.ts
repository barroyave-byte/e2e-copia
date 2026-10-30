const uuid = crypto.randomUUID();

const email = `${uuid}12345@testuser.com`;

const orderPayload = {
  order_type: 'DEUNA_CHECKOUT',
  order: {
    order_id: uuid,
    store_code: 'all',
    currency: 'MXN',
    items_total_amount: 1750,
    display_items_total_amount: 'MXN 17.50',
    sub_total: 1750,
    display_sub_total: 'MXN 17.50',
    total_amount: 1750,
    display_total_amount: 'MXN 17.50',
    redirect_urls: {
      close: 'https://www.deuna.com/?q=close',
      error: 'https://www.deuna.com/?q=error',
      fallback: 'https://www.deuna.com/?q=fallback',
      pending: 'https://www.deuna.com/?q=pending',
      success: 'https://www.deuna.com/?q=success'
    },
    shipping_address: {
      first_name: '',
      last_name: '',
      email: email,
      phone: ''
    },
    billing_address: {
      first_name: '',
      last_name: '',
      email: email,
      phone: ''
    },
    items: [
      {
        id: '01',
        name: 'Juegos de la Muerte',
        description: 'Juegos de la muerte - Mitikah - 10/01/2024 22:10',
        total_amount: {
          currency: 'MXN',
          amount: 1750,
          display_amount: 'MXN 17.50'
        },
        unit_price: {
          currency: 'MXN',
          amount: 1750,
          display_amount: 'MXN 17.50'
        },
        quantity: 1,
        sku: 'SKU-00001',
        brand: 'Bolt Swagstore',
        category: 'ticket',
        image_url: 'https://statics.cinemex.com/movie_posters/7uUQHyJhhUtmQlq-360x540.jpg'
      }
    ]
  },
  checkout_modules: [
    {
      name: 'BillingPattern',
      props: {
        show_in_main_view: false,
        fields: [
          {
            name: 'first_name',
            validation: {
              required: true
            }
          },
          {
            name: 'last_name',
            validation: {
              required: true
            }
          },
          {
            name: 'phone',
            validation: {
              required: true
            }
          }
        ]
      }
    }
  ]
};

export default orderPayload;
