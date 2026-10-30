import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';
import { ApiResponse } from '../BaseHttpClient';
import { EndpointConfig } from '../config/EndpointConfig';

@RegisterService(SERVICE_KEYS.PERMIT_IO)
export class PermitService extends BaseService {
  async deleteMerchant(merchantId: string, tokenPermit: string): Promise<ApiResponse> {
    try {
      const response = await this.httpClient.request<ApiResponse>({
        url: EndpointConfig.getEndpoint('permitIo', 'deleteMerchant'),
        pathParams: {
          merchantId,
        },
        method: 'DELETE',
        auth: {
          type: 'bearer',
          token: tokenPermit,
        },
      });
      console.log("[INFO] --> delete merchant from permit io successfully");
      return response;
    } catch (error) {
      throw new Error(`Delete merchant failed: ${JSON.stringify(error, null, 2)}`);
    }
  }

  /**
   * Bulk deletes multiple merchants from Permit.io
   * @param merchantIds - Array of merchant IDs to delete
   * @param tokenPermit - Permit.io authentication token
   * @returns Promise with API response
   * @throws Error if bulk deletion fails
   * 
   * @example
   * ```typescript
   * const merchantIds = ['merchant-1', 'merchant-2', 'merchant-3'];
   * await permitService.bulkDeleteMerchants(merchantIds, process.env.PERMIT_TOKEN);
   * ```
   */
  async bulkDeleteMerchants(merchantIds: string[], tokenPermit: string): Promise<ApiResponse> {
    if (!merchantIds || merchantIds.length === 0) {
      console.log('[INFO] --> No merchants to delete, skipping bulk deletion');
      return { data: { message: 'No merchants to delete' } } as ApiResponse;
    }

    try {
      // Format merchant IDs as required by Permit.io API
      // Each merchant ID needs to be prefixed with "merchant:" format
      const formattedIdents = merchantIds.map(id => `merchant:${id}`);

      const payload = {
        idents: formattedIdents,
      };

      console.log(`[INFO] --> Attempting to bulk delete ${merchantIds.length} merchants from Permit.io`);
      
      const response = await this.httpClient.request<ApiResponse>({
        url: EndpointConfig.getEndpoint('permitIo', 'bulkDeleteMerchants'),
        method: 'DELETE',
        data: payload,
        headers: {
          'Content-Type': 'application/json',
        },
        auth: {
          type: 'bearer',
          token: tokenPermit,
        },
        logging: {
          logRequest: false,
          logResponse: true,
        },
      });

      console.log(`[SUCCESS] --> Bulk deleted ${merchantIds.length} merchants from Permit.io successfully`);
      return response;
    } catch (error) {
      console.error(`[ERROR] --> Bulk delete merchants failed:`, error);
      throw new Error(
        `Bulk delete merchants failed for ${merchantIds.length} merchants: ${JSON.stringify(error, null, 2)}`
      );
    }
  }
}
