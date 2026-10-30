# HTTP Services Architecture Guide

## Overview

This architecture provides a type-safe, modular, and maintainable approach to HTTP API testing. It follows SOLID principles and includes:

- **BaseHttpClient**: Core HTTP client with Axios
- **BaseService**: Abstract class for all services
- **Service Registry & Factory**: Automatic service registration and retrieval
- **EndpointConfig**: Centralized endpoint management
- **Models**: TypeScript interfaces for type safety
- **TestData**: Reusable test data builders and presets

## Architecture Components

```
playwright/support/http/
├── BaseHttpClient.ts          # Core HTTP client
├── ServiceFactory.ts          # Service instantiation
├── ServiceRegistry.ts         # Service registration
├── config/
│   └── EndpointConfig.ts      # API endpoints
├── decorators/
│   └── ServiceDecorator.ts    # @RegisterService decorator
├── models/                     # Request/Response interfaces
├── services/                   # Service implementations
├── testData/                   # Test data builders & defaults
├── types/
│   └── ServiceTypes.ts        # Service type definitions
└── utils/                      # Utilities (deepMerge, etc.)
```

---

## Quick Start: Adding a New Service

Follow these steps to add a new service (e.g., `OrderService`):

### 1. Create Models

Create TypeScript interfaces for requests and responses in `models/order.ts`:

```typescript
// models/order.ts

/**
 * Create Order Request
 */
export interface CreateOrderRequest {
  merchantId: string;
  merchantToken: string;
  orderData: OrderData;
}

export interface OrderData {
  order_id: string;
  amount: number;
  currency: string;
  items: OrderItem[];
}

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

/**
 * Create Order Response
 */
export interface CreateOrderResponse {
  id: string;
  order_id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

/**
 * Get Order Request
 */
export interface GetOrderRequest {
  orderId: string;
  merchantToken: string;
}

/**
 * Get Order Response
 */
export interface GetOrderResponse extends CreateOrderResponse {
  updated_at: string;
}
```

**Best Practices:**

- Use clear, descriptive interface names
- Separate request/response interfaces
- Include JSDoc comments for documentation
- Export all interfaces

---

### 2. Add Endpoints

Add your service endpoints to `config/EndpointConfig.ts`:

```typescript
// config/EndpointConfig.ts

private static readonly endpoints = {
  // ... existing endpoints
  order: {
    create: '/orders',
    get: '/orders/{orderId}',
    update: '/orders/{orderId}',
    cancel: '/orders/{orderId}/cancel',
    list: '/merchants/{merchantId}/orders',
  },
  // ... other services
} as const;
```

**Best Practices:**

- Use lowercase service names
- Use descriptive operation names
- Use path parameters with `{paramName}` syntax
- Keep endpoints organized by service

---

### 3. Register Service Type

Add your service to `types/ServiceTypes.ts`:

```typescript
// types/ServiceTypes.ts

export const SERVICE_KEYS = {
  // ... existing keys
  ORDER: 'order',
} as const;

export interface ServiceTypeMap {
  // ... existing mappings
  [SERVICE_KEYS.ORDER]: import('../services/OrderService').OrderService;
}
```

**Best Practices:**

- Use SCREAMING_SNAKE_CASE for service keys
- Use camelCase for the string value
- Add TypeScript import for type safety

---

### 4. Create TestData (Optional but Recommended)

Create reusable test data in `testData/order/`:

```typescript
// testData/order/OrderDefaults.ts

import { OrderData } from '../../models/order';

export const DEFAULT_ORDER_DATA: OrderData = {
  order_id: 'ORD-123456',
  amount: 10000,
  currency: 'USD',
  items: [
    {
      name: 'Test Product',
      price: 10000,
      quantity: 1,
    },
  ],
};
```

```typescript
// testData/order/OrderBuilder.ts

import { deepMerge } from '../../utils/deepMerge';
import { DEFAULT_ORDER_DATA } from './OrderDefaults';
import { OrderData } from '../../models/order';

export class OrderBuilder {
  /**
   * Build order data with custom overrides
   */
  static build(overrides: Partial<OrderData> = {}): OrderData {
    return deepMerge(DEFAULT_ORDER_DATA, overrides);
  }

  /**
   * Build order with multiple items
   */
  static buildWithMultipleItems(itemCount: number = 3): OrderData {
    const items = Array.from({ length: itemCount }, (_, i) => ({
      name: `Product ${i + 1}`,
      price: 1000 * (i + 1),
      quantity: 1,
    }));

    return this.build({ items });
  }
}
```

```typescript
// testData/order/index.ts

export { DEFAULT_ORDER_DATA } from './OrderDefaults';
export { OrderBuilder } from './OrderBuilder';
```

**Best Practices:**

- Keep defaults simple and realistic
- Use builders for complex scenarios
- Create presets for common use cases
- Export everything through index.ts

---

### 5. Create the Service

Create your service class in `services/OrderService.ts`:

```typescript
// services/OrderService.ts

import { BaseService } from './BaseService';
import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { EndpointConfig } from '../config/EndpointConfig';
import {
  CreateOrderRequest,
  CreateOrderResponse,
  GetOrderRequest,
  GetOrderResponse,
} from '../models/order';

@RegisterService(SERVICE_KEYS.ORDER)
export class OrderService extends BaseService {
  /**
   * Create a new order
   */
  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      const response = await this.httpClient.request<CreateOrderResponse>({
        url: EndpointConfig.getEndpoint('order', 'create'),
        method: 'POST',
        data: request.orderData,
        auth: {
          type: 'bearer',
          token: request.merchantToken,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Order creation failed: ${error}`);
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(request: GetOrderRequest): Promise<GetOrderResponse> {
    try {
      const response = await this.httpClient.request<GetOrderResponse>({
        url: EndpointConfig.getEndpoint('order', 'get'),
        method: 'GET',
        auth: {
          type: 'bearer',
          token: request.merchantToken,
        },
        pathParams: {
          orderId: request.orderId,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Get order failed: ${error}`);
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, merchantToken: string): Promise<void> {
    try {
      await this.httpClient.request<void>({
        url: EndpointConfig.getEndpoint('order', 'cancel'),
        method: 'POST',
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        pathParams: {
          orderId: orderId,
        },
      });
    } catch (error) {
      throw new Error(`Cancel order failed: ${error}`);
    }
  }
}
```

**Best Practices:**

- Extend `BaseService`
- Use `@RegisterService` decorator
- Add JSDoc comments for each method
- Use type-safe request/response models
- Handle errors with descriptive messages
- Use `EndpointConfig.getEndpoint()` for URLs
- Wrap responses appropriately

---

### 6. Export Service (if needed)

Add your service to `services/index.ts`:

```typescript
// services/index.ts

export { OrderService } from './OrderService';
// ... other exports
```

---

### 7. Use in Tests

Use your service via fixtures in test files:

```typescript
// tests/order.spec.ts

import { test } from '@support/fixtures';
import { OrderBuilder } from '@support/http/testData/order';

test.describe('Order Tests', () => {
  let merchantId: string;
  let merchantToken: string;

  test.beforeAll(async ({ merchantAuthService }) => {
    // Setup merchant
    const merchant = await merchantAuthService.createBasicMerchant({
      country: 'MX',
    });
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
  });

  test('should create order successfully', async ({ orderService }) => {
    // Build test data using builder
    const orderData = OrderBuilder.build({
      order_id: `ORD-${Date.now()}`,
      amount: 15000,
    });

    // Call service method
    const response = await orderService.createOrder({
      merchantId,
      merchantToken,
      orderData,
    });

    // Assertions
    expect(response.status).toBe('pending');
    expect(response.total_amount).toBe(15000);
  });

  test('should get order by ID', async ({ orderService }) => {
    // Create order first
    const orderData = OrderBuilder.buildWithMultipleItems(2);
    const createResponse = await orderService.createOrder({
      merchantId,
      merchantToken,
      orderData,
    });

    // Get order
    const getResponse = await orderService.getOrder({
      orderId: createResponse.id,
      merchantToken,
    });

    expect(getResponse.id).toBe(createResponse.id);
    expect(getResponse.status).toBe('pending');
  });
});
```

---

## Authentication Patterns

The HTTP client supports multiple authentication types:

### Bearer Token

```typescript
auth: {
  type: 'bearer',
  token: merchantToken,
}
```

### API Key

```typescript
auth: {
  type: 'api-key',
  apiKey: privateKey,
}
```

### Custom Headers

```typescript
headers: {
  'X-Api-Key': privateKey,
  'X-Merchant-Id': merchantId,
}
```

---

## Path Parameters

Use path parameters for dynamic URLs:

```typescript
// Endpoint: /merchants/{merchantId}/orders/{orderId}
const response = await this.httpClient.request({
  url: EndpointConfig.getEndpoint('order', 'get'),
  method: 'GET',
  pathParams: {
    merchantId: '123',
    orderId: '456',
  },
});
```

---

## Query Parameters

Use the `params` option for query strings:

```typescript
const response = await this.httpClient.request({
  url: EndpointConfig.getEndpoint('order', 'list'),
  method: 'GET',
  params: {
    status: 'pending',
    limit: 10,
    offset: 0,
  },
});
// Results in: /orders?status=pending&limit=10&offset=0
```

---

## Logging Configuration

The HTTP client supports configurable logging to control what information is printed to the console. You can configure logging at both global and per-request levels.

### Quick Example: Disable Request Logging

```typescript
// Disable request logging for sensitive endpoints
const response = await this.httpClient.request({
  url: EndpointConfig.getEndpoint('permitIo', 'bulkDeleteMerchants'),
  method: 'DELETE',
  data: payload,
  logging: {
    logRequest: false, // Don't log the request
    logResponse: true, // But log the response
  },
});
```

### Available Options

```typescript
interface LoggingConfig {
  logRequest?: boolean; // Enable/disable request logging
  logResponse?: boolean; // Enable/disable response logging
  logHeaders?: boolean; // Enable/disable headers logging
  logData?: boolean; // Enable/disable request/response body logging
}
```

### Common Use Cases

- **Sensitive Data**: Set `logRequest: false` to avoid logging tokens, passwords, or PII
- **Large Payloads**: Set `logData: false` to avoid logging large request/response bodies
- **Debugging**: Enable all logging (default behavior) to see complete information
- **CI/CD**: Use minimal global logging and enable selectively for debugging

**For detailed logging configuration and examples, see [README-LOGGING.md](./README-LOGGING.md)**

---

## Advanced Patterns

### Orchestration Services

For complex flows involving multiple service calls, create orchestration methods:

```typescript
@RegisterService(SERVICE_KEYS.ORDER)
export class OrderService extends BaseService {
  /**
   * Complete order flow: create order, process payment, confirm
   */
  async processCompleteOrder(
    merchantId: string,
    merchantToken: string,
    orderData: OrderData
  ): Promise<OrderResponse> {
    // Step 1: Create order
    const order = await this.createOrder({
      merchantId,
      merchantToken,
      orderData,
    });

    // Step 2: Process payment (call PaymentService)
    const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
    const payment = await paymentService.processPayment({
      orderId: order.id,
      amount: order.total_amount,
    });

    // Step 3: Confirm order
    await this.confirmOrder(order.id, merchantToken);

    return order;
  }
}
```

### Country-Specific Configuration

Create configuration helpers for country-specific data:

```typescript
// testData/order/OrderConfigByCountry.ts

export class OrderConfigByCountry {
  private static readonly CONFIGS: Record<CountryCodes, Partial<OrderData>> = {
    MX: {
      currency: 'MXN',
    },
    BR: {
      currency: 'BRL',
    },
    // ... other countries
  };

  static buildForCountry(country: CountryCodes): OrderData {
    const config = this.CONFIGS[country];
    return OrderBuilder.build(config);
  }
}
```

---

## Testing Best Practices

1. **Use Fixtures**: Inject services via Playwright fixtures, not directly
2. **Use Builders**: Keep test data management clean with builders
3. **Avoid Hardcoding**: Use constants and environment variables
4. **Error Handling**: Always handle expected errors gracefully
5. **Cleanup**: Clean up test data in `afterAll` hooks
6. **Isolation**: Each test should be independent

---

## Common Patterns

### Required Credentials

Take the merchant's credentials as required parameters. They used to default to
`SaveConfig`, which read `process.env.MERCHANT_TOKEN_NEW` — a value shared by every spec in
the worker, so a service call could run against another spec's merchant:

```typescript
async getOrder(orderId: string, merchantToken: string): Promise<OrderResponse> {
  // Implementation
}
```

### Expect Error Pattern

For testing error scenarios:

```typescript
async deleteOrder(
  orderId: string,
  merchantToken: string,
  expectError: boolean = false
): Promise<number | void> {
  const response = await this.httpClient.request({
    // ... config
    expectError: expectError,
  });

  if (expectError) {
    return response.status;
  }

  return response.data;
}
```

---

## Troubleshooting

### Service Not Found

**Error**: `Service not found: order`

**Solution**: Ensure:

1. Service is decorated with `@RegisterService`
2. Service is imported somewhere (e.g., in fixtures)
3. Service key is added to `SERVICE_KEYS`

### TypeScript Errors

**Error**: Type errors when getting service

**Solution**: Ensure service is added to `ServiceTypeMap` in `types/ServiceTypes.ts`

### Path Parameters Not Replaced

**Error**: URL shows `{orderId}` instead of actual value

**Solution**: Ensure `pathParams` is passed in the request config

---

## Examples

See existing services for reference:

- **Simple CRUD**: `UserAuthService.ts`
- **Complex Orchestration**: `MerchantAuthService.ts` (see `createBasicMerchant`)
- **Country-Specific Logic**: `testData/merchant_auth/MerchantConfigByCountry.ts`
- **Test Data Builders**: `testData/user_auth/`

---

## Summary Checklist

When adding a new service, ensure you've completed:

- [ ] Created models in `models/[service].ts`
- [ ] Added endpoints to `config/EndpointConfig.ts`
- [ ] Added service key to `types/ServiceTypes.ts`
- [ ] Created service class extending `BaseService`
- [ ] Added `@RegisterService` decorator
- [ ] Implemented service methods with proper error handling
- [ ] Created testData defaults and builders (if needed)
- [ ] Exported service from `services/index.ts`
- [ ] Added service to fixtures (if not using ServiceFactory directly)
- [ ] Wrote tests using the new service

---

## Need Help?

- Review existing services in `services/` directory
- Check test examples in `tests/` directory
- Refer to `BaseHttpClient.ts` for available HTTP options
- Consult the team for architecture questions
