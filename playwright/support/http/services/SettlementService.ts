import { ApiResponse } from '../BaseHttpClient';
import { BaseService } from './BaseService';
import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { EndpointConfig } from '../config/EndpointConfig';
import {
  CreateBatchBody,
  CreateBatchResponse,
  StatusBatchFileBody,
  StatusBatchFileResponse,
  GetBatchResponse,
  UploadFileBody,
} from '../models/settlement';

@RegisterService(SERVICE_KEYS.SETTLEMENT)
export class SettlementService extends BaseService {
  async createBatch(
    privateKey: string,
    body: CreateBatchBody
  ): Promise<ApiResponse<CreateBatchResponse>> {
    try {
      return await this.httpClient.request<CreateBatchResponse>({
        url: EndpointConfig.getEndpoint('settlement', 'createBatch'),
        method: 'POST',
        data: body,
        auth: { type: 'api-key', apiKey: privateKey },
      });
    } catch (error) {
      throw new Error(`createBatch failed: ${JSON.stringify(error)}`);
    }
  }

  async statusBatchFile(
    privateKey: string,
    body: StatusBatchFileBody
  ): Promise<ApiResponse<StatusBatchFileResponse>> {
    try {
      return await this.httpClient.request<StatusBatchFileResponse>({
        url: EndpointConfig.getEndpoint('settlement', 'statusBatchFile'),
        method: 'POST',
        data: body,
        auth: { type: 'api-key', apiKey: privateKey },
      });
    } catch (error) {
      throw new Error(`statusBatchFile failed: ${JSON.stringify(error)}`);
    }
  }

  async getBatch(batchId: string): Promise<ApiResponse<GetBatchResponse>> {
    try {
      return await this.httpClient.request<GetBatchResponse>({
        url: `${EndpointConfig.getEndpoint('settlement', 'getBatch')}?batch_id=${batchId}`,
        method: 'GET',
      });
    } catch (error) {
      throw new Error(`getBatch failed: ${JSON.stringify(error)}`);
    }
  }

  async uploadFile(processorName: string, body: UploadFileBody): Promise<void> {
    try {
      await this.httpClient.request({
        url: EndpointConfig.getEndpoint('settlement', 'uploadFile'),
        method: 'POST',
        data: body,
        pathParams: { processorName },
      });
    } catch (error) {
      throw new Error(`uploadFile failed: ${JSON.stringify(error)}`);
    }
  }

  async uploadInternalFile(
    fileType: string,
    body: { file_content_base64: string }
  ): Promise<ApiResponse<unknown>> {
    try {
      return await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('settlement', 'uploadInternalFile'),
        method: 'POST',
        data: body,
        pathParams: { fileType },
      });
    } catch (error) {
      throw new Error(`uploadInternalFile failed: ${JSON.stringify(error)}`);
    }
  }
}
