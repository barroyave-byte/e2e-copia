# HTTP Request/Response Logging Configuration

This document explains how to configure HTTP request and response logging in the testing framework.

## Overview

The logging system is now fully configurable, allowing you to control what information is printed to the console at both global and per-request levels.

## Logging Configuration

### LoggingConfig Interface

```typescript
interface LoggingConfig {
  logRequest?: boolean;   // Enable/disable request logging
  logResponse?: boolean;  // Enable/disable response logging
  logHeaders?: boolean;   // Enable/disable headers logging
  logData?: boolean;      // Enable/disable request/response body/data logging
}
```

## Configuration Levels

### 1. Global Configuration (HttpClientConfig)

Sets the default behavior for all requests:

```typescript
const httpClient = new BaseHttpClient({
  baseUrl: 'https://api.example.com',
  logging: {
    logRequest: true,
    logResponse: true,
    logHeaders: false,    // Don't show headers by default
    logData: true,
  }
});
```

### 2. Per-Request Override (RequestConfig)

Overrides the global configuration for a specific request:

```typescript
// Disable logging completely for a request
await httpClient.request({
  method: 'DELETE',
  url: '/sensitive-endpoint',
  logging: {
    logRequest: false,
    logResponse: false,
  }
});

// Only show response, not request
await httpClient.request({
  method: 'POST',
  url: '/bulk-operation',
  data: payload,
  logging: {
    logRequest: false,
    logResponse: true,
  }
});

// Only show headers, not data
await httpClient.request({
  method: 'GET',
  url: '/user-info',
  logging: {
    logHeaders: true,
    logData: false,
  }
});
```

## Practical Examples

### Example 1: Disable logging for sensitive requests

```typescript
// In PermitService.bulkDeleteMerchants
const response = await this.httpClient.request<ApiResponse>({
  url: EndpointConfig.getEndpoint('permitIo', 'bulkDeleteMerchants'),
  method: 'DELETE',
  data: payload,
  auth: {
    type: 'bearer',
    token: tokenPermit,
  },
  // Don't show request to avoid logging sensitive merchant IDs
  logging: {
    logRequest: false,
    logResponse: true,
  },
});
```

### Example 2: Minimal configuration for debugging

```typescript
// Only show response status, without data or headers
await httpClient.request({
  method: 'GET',
  url: '/large-dataset',
  logging: {
    logRequest: true,
    logResponse: true,
    logHeaders: false,
    logData: false,  // Don't show data because it can be very large
  }
});
```

### Example 3: Full logging for debugging

```typescript
// Show everything (default behavior)
await httpClient.request({
  method: 'POST',
  url: '/debug-endpoint',
  data: testData,
  // Not specifying logging = uses global configuration
});
```

### Example 4: Restrictive global configuration with selective overrides

```typescript
// Global configuration: minimal logging
const httpClient = new BaseHttpClient({
  baseUrl: 'https://api.example.com',
  logging: {
    logRequest: false,
    logResponse: false,
  }
});

// But enable logging for specific requests you need to debug
await httpClient.request({
  method: 'POST',
  url: '/debug-this-endpoint',
  data: payload,
  logging: {
    logRequest: true,
    logResponse: true,
    logData: true,
  }
});
```

## Default Behavior

If you don't specify any logging configuration, the default behavior is:

```typescript
{
  logRequest: true,
  logResponse: true,
  logHeaders: true,
  logData: true,
}
```

## Usage in Services

### BaseService Already Inherits BaseHttpClient

All services that extend `BaseService` automatically have access to this functionality:

```typescript
@RegisterService(SERVICE_KEYS.MY_SERVICE)
export class MyService extends BaseService {
  async sensitiveOperation(data: any): Promise<ApiResponse> {
    return this.httpClient.request({
      method: 'POST',
      url: '/sensitive',
      data,
      logging: {
        logRequest: false,  // Don't show sensitive data
        logResponse: true,
      }
    });
  }

  async debugOperation(data: any): Promise<ApiResponse> {
    return this.httpClient.request({
      method: 'POST',
      url: '/debug',
      data,
      // Use default configuration (full logging)
    });
  }
}
```

## Common Use Cases

### 1. **Endpoints with Sensitive Data**
- `logRequest: false` - Don't show tokens, passwords, PII
- `logResponse: true` - Verify operation was successful

### 2. **Endpoints with Large Payloads**
- `logData: false` - Don't show large bodies
- `logRequest: true, logResponse: true` - Show method, URL and status

### 3. **Deep Debugging**
- Everything enabled - See complete information

### 4. **Tests in CI/CD**
- Minimal global configuration for clean logs
- Enable logging only when tests fail

## Important Notes

1. **Request Errors**: Request errors are always logged to facilitate debugging
2. **X-Request-Id**: A unique UUID is always added to each request for tracking
3. **Configuration Merging**: Request configuration is merged with global config, it doesn't replace it completely
4. **Performance**: Disabling logging can slightly improve performance in massive executions

## Migration from Previous Version

If you have existing code, you don't need to change anything. The default behavior is the same as before (full logging). You only need to add the `logging` configuration where you want to change the behavior.
