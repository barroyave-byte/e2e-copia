import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';
import { EndpointConfig } from '../config/EndpointConfig';
import {
  StatsigCreateGateRuleBody,
  StatsigUpdateGateRuleBody,
  StatsigGetGateRulesResponse,
} from '../models/statsig';
import { ApiResponse, ApiError } from '../BaseHttpClient';

const GATE_MUTATION_CONFLICT_STATUS = 409;
/**
 * Statsig also reports a stale gate document as a 400 carrying this message, not only as a
 * 409. Observed on a delete while another run was writing the same gate:
 * "Config has been modified since your change. Please refresh to update and try again."
 */
const GATE_MUTATION_CONFLICT_MESSAGE = /config has been modified/i;
const GATE_MUTATION_MAX_ATTEMPTS = 5;
const GATE_MUTATION_BASE_DELAY_MS = 500;

@RegisterService(SERVICE_KEYS.STATSIG)
export class StatsigService extends BaseService {
  /**
   * Statsig stores all rules for a gate inside that gate's single document and
   * enforces optimistic concurrency on it. Concurrent create/update/delete-rule
   * calls against the same gate (e.g. parallel test workers) can race on that
   * document version and get rejected with 409, even though each call targets a
   * different rule. Retrying after a short backoff resolves once the racing
   * write has landed.
   */
  private isGateConflict(error: unknown): boolean {
    const apiError = error as ApiError;
    if (apiError?.status === GATE_MUTATION_CONFLICT_STATUS) return true;
    const message = `${apiError?.description ?? ''} ${apiError?.data?.message ?? ''}`;
    return GATE_MUTATION_CONFLICT_MESSAGE.test(message);
  }

  private async retryOnGateConflict<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (!this.isGateConflict(error) || attempt >= GATE_MUTATION_MAX_ATTEMPTS) {
          throw error;
        }
        const delay = GATE_MUTATION_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(
          `[Statsig] Gate rule mutation conflicted, retrying in ${delay}ms (attempt ${attempt})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Creates a rule on a Statsig feature gate.
   */
  async createGateRule(
    apiKey: string,
    featureFlagId: string,
    body: StatsigCreateGateRuleBody
  ): Promise<ApiResponse> {
    try {
      return await this.retryOnGateConflict(() =>
        this.httpClient.request({
          url: EndpointConfig.getEndpoint('statsig', 'createGateRule'),
          method: 'POST',
          data: body,
          headers: { 'STATSIG-API-KEY': apiKey },
          pathParams: { featureFlagId },
        })
      );
    } catch (error) {
      throw new Error(`createGateRule failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Deletes a rule from a Statsig feature gate.
   */
  async deleteGateRule(
    apiKey: string,
    featureFlagId: string,
    ruleId: string
  ): Promise<ApiResponse> {
    try {
      return await this.retryOnGateConflict(() =>
        this.httpClient.request({
          url: EndpointConfig.getEndpoint('statsig', 'deleteGateRule'),
          method: 'DELETE',
          headers: { 'STATSIG-API-KEY': apiKey },
          pathParams: { featureFlagId, ruleId },
        })
      );
    } catch (error) {
      throw new Error(`deleteGateRule failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Updates a rule on a Statsig feature gate.
   */
  async updateGateRule(
    apiKey: string,
    featureFlagId: string,
    ruleId: string,
    body: StatsigUpdateGateRuleBody
  ): Promise<ApiResponse> {
    try {
      return await this.retryOnGateConflict(() =>
        this.httpClient.request({
          url: EndpointConfig.getEndpoint('statsig', 'updateGateRule'),
          method: 'PATCH',
          data: body,
          headers: { 'STATSIG-API-KEY': apiKey },
          pathParams: { featureFlagId, ruleId },
        })
      );
    } catch (error) {
      throw new Error(`updateGateRule failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Returns all rules for a Statsig feature gate.
   */
  async getGateRules(
    apiKey: string,
    featureFlagId: string
  ): Promise<ApiResponse<StatsigGetGateRulesResponse>> {
    try {
      return await this.httpClient.request<StatsigGetGateRulesResponse>({
        url: EndpointConfig.getEndpoint('statsig', 'getGateRules'),
        method: 'GET',
        headers: { 'STATSIG-API-KEY': apiKey },
        pathParams: { featureFlagId },
      });
    } catch (error) {
      throw new Error(`getGateRules failed: ${JSON.stringify(error)}`);
    }
  }
}
