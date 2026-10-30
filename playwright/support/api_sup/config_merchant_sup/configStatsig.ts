import { expect } from '@playwright/test';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';
import {
  FlagNames,
  PaymentType,
  RuleNames,
  PROJECT_MAPPING,
} from '@support/interfaces/statsig/statsig';
import { StatsigCondition, StatsigRule } from '@support/api/interfaces/statsigFeatureGates';
import envConfig from '@support/envConfig';

const statsigURL = envConfig.STATSIG_URL;

/**
 * How long a gate rule written through the console API needs before the SDKs that
 * consume it (guard, for the fraud gates) actually evaluate with it. The console
 * API stores the rule immediately, but the change only reaches an SDK after it
 * downloads the config spec again, and there is no endpoint that reports when that
 * happened.
 *
 * Measured on staging with PI-T1919 (cash order must skip fraud evaluation):
 * a rule written 17-22s before the purchase was still ignored in 6/6 serialized
 * runs, while >=30s was honoured in 3/3, >=50s in 2/2 and >=110s in 2/2. 45s keeps
 * margin for a slower CI runner.
 */
const STATSIG_RULE_PROPAGATION_MS = 45_000;

/** How often `pollUntilRuleIsLive` re-checks the rule while it waits out the window. */
const STATSIG_RULE_POLL_INTERVAL_MS = 5_000;

/** Upper bound for the merchants kept in a rule's `merchant_id` condition. */
const MAX_MERCHANTS_PER_RULE = 20;

/** Statsig rejects a rule name longer than this with a 400. */
const MAX_RULE_NAME_LENGTH = 100;

/** How many times `ensureCreateOrUpdateRule` re-merges after finding itself evicted. */
const MAX_RULE_WRITE_ATTEMPTS = 3;

function getStatsigApiKey(featureFlagID?: FlagNames | string): string {
  if (featureFlagID && PROJECT_MAPPING[featureFlagID as FlagNames]) {
    const project = PROJECT_MAPPING[featureFlagID as FlagNames];
    console.log(`Using ${project.toUpperCase()} project API key for flag: ${featureFlagID}`);

    if (project === 'fraud' && envConfig.STATSIG_FRAUD_API_KEY) {
      return envConfig.STATSIG_FRAUD_API_KEY;
    }
    if (project === 'payments' && envConfig.STATSIG_PAYMENTS_API_KEY) {
      return envConfig.STATSIG_PAYMENTS_API_KEY;
    }
    if (project === 'admin' && envConfig.STATSIG_ADMIN_API_KEY) {
      return envConfig.STATSIG_ADMIN_API_KEY;
    }

    console.log(`No specific API key found for ${project.toUpperCase()} project, using fallback`);
  }

  console.log(`Using fallback API key`);
  return envConfig.STATSIG_API_KEY;
}

export default class ConfigStatsig {
  /**
   * A rule name unique to this run's merchant, within Statsig's 100-character limit.
   *
   * The merchant id is what makes the name unique, so the base name is what gets truncated
   * when the two do not fit. `merchants-that-use-multi-capture-with-lock-not-complete-amount-test`
   * plus a merchant UUID is 104 characters, and Statsig answered 400 for it.
   */
  uniqueRuleName(baseName: string, merchantId: string): string {
    const suffix = `-${merchantId}`;
    return `${baseName.slice(0, MAX_RULE_NAME_LENGTH - suffix.length)}${suffix}`;
  }

  /**
   * Last rule this instance wrote per feature flag, so `pollUntilRuleIsLive` knows what to
   * verify and can let the rest of the setup count towards the propagation window. Keyed by
   * flag because every spec writes a single rule per flag.
   */
  private readonly lastRuleWrite = new Map<
    string,
    { at: number; name: string; reapply?: () => Promise<void> }
  >();

  /**
   * Records the rule this instance just wrote, and — only for a rule shared between
   * merchants — how to write it again.
   *
   * `pollUntilRuleIsLive` used to take that `reapply` as an option, so a spec that shared a
   * rule and forgot to pass it lost the protection silently. Registering it at write time
   * means the spec no longer has to know: a rule named after its own merchant registers no
   * `reapply`, because no other run can evict it.
   */
  private markRuleWritten(
    featureFlagID: FlagNames | string,
    ruleName: string,
    reapply?: () => Promise<void>
  ): void {
    this.lastRuleWrite.set(String(featureFlagID), { at: Date.now(), name: ruleName, reapply });
  }

  async createFeatureFlagRule(
    featureFlagID: FlagNames,
    ruleID: RuleNames,
    paymentType: PaymentType,
    merchantId: string
  ) {
    const statsigApiKey = getStatsigApiKey(featureFlagID);
    console.log('Statsig start: Create Feature Flag Rule', featureFlagID, ruleID);
    const statsigService = ServiceFactory.getService(SERVICE_KEYS.STATSIG, statsigURL);
    const statsigResponse = await statsigService.createGateRule(statsigApiKey, featureFlagID, {
      name: ruleID,
      passPercentage: 100,
      conditions: [
        {
          type: 'custom_field',
          targetValue: [merchantId],
          operator: 'any',
          field: 'merchant_id',
        },
        {
          type: 'custom_field',
          targetValue: [paymentType],
          operator: 'any',
          field: 'payment_type',
        },
      ],
      environments: ['development', 'staging', 'production'],
      id: ruleID,
      baseID: ruleID,
      returnValue: {},
    });
    console.log('createFeatureFlagRule response: ', statsigResponse);
  }

  async deleteFeatureFlagRule(featureFlagID: FlagNames, ruleID: RuleNames) {
    const statsigApiKey = getStatsigApiKey(featureFlagID);
    console.log('Statsig start: Delete Feature Flag Rule', featureFlagID, ruleID);
    const statsigService = ServiceFactory.getService(SERVICE_KEYS.STATSIG, statsigURL);
    const statsigResponse = await statsigService.deleteGateRule(
      statsigApiKey,
      featureFlagID,
      ruleID
    );
    console.log('deleteFeatureFlagRule response: ', statsigResponse);
  }

  async getFeatureFlagRules(featureFlagID: FlagNames): Promise<any[]> {
    const statsigApiKey = getStatsigApiKey(featureFlagID);
    const statsigService = ServiceFactory.getService(SERVICE_KEYS.STATSIG, statsigURL);
    const statsigResponse = await statsigService.getGateRules(statsigApiKey, featureFlagID);
    return statsigResponse.data?.data?.[0]?.rules || [];
  }

  async updateFeatureFlagRule(
    featureFlagID: FlagNames,
    ruleID: string,
    ruleName: RuleNames,
    paymentType: PaymentType,
    merchantIds: string[]
  ) {
    const statsigApiKey = getStatsigApiKey(featureFlagID);
    const statsigService = ServiceFactory.getService(SERVICE_KEYS.STATSIG, statsigURL);
    await statsigService.updateGateRule(statsigApiKey, featureFlagID, ruleID, {
      name: ruleName,
      id: ruleID,
      baseID: ruleID,
      passPercentage: 100,
      conditions: [
        {
          type: 'custom_field',
          targetValue: merchantIds,
          operator: 'any',
          field: 'merchant_id',
        },
        {
          type: 'custom_field',
          targetValue: [paymentType],
          operator: 'any',
          field: 'payment_type',
        },
      ],
      environments: ['development', 'staging', 'production'],
      returnValue: {},
    });
  }

  /**
   * Puts this run's merchant on the shared rule and confirms it stayed there.
   *
   * The write is a read-modify-write on the rule's `merchant_id` list, and Statsig's update
   * endpoint takes no version or etag: two runs that read the same list both get a 200 and
   * the later write silently drops the earlier merchant. There is no 409 to retry on -- the
   * gate-document conflict that `StatsigService` retries is a different race. So the write
   * is verified by reading the rule back, and re-merged when this merchant is missing.
   */
  async ensureCreateOrUpdateRule(
    featureFlagID: FlagNames,
    ruleName: RuleNames,
    paymentType: PaymentType,
    merchantId: string
  ) {
    for (let attempt = 1; attempt <= MAX_RULE_WRITE_ATTEMPTS; attempt++) {
      const featureFlagRules = await this.getFeatureFlagRules(featureFlagID);
      const rule = featureFlagRules.find((r) => r.name === ruleName);
      if (rule) {
        await this.updateFeatureFlagRule(
          featureFlagID,
          rule.id,
          ruleName,
          paymentType,
          this.mergeMerchantIds(rule, merchantId)
        );
      } else {
        await this.createFeatureFlagRule(featureFlagID, ruleName, paymentType, merchantId);
      }

      if (await this.ruleTargetsMerchant(featureFlagID, ruleName, merchantId)) {
        this.markRuleWritten(featureFlagID, ruleName, () =>
          this.ensureCreateOrUpdateRule(featureFlagID, ruleName, paymentType, merchantId)
        );
        return;
      }

      console.log(
        `[Statsig] rule "${ruleName}" no longer targets ${merchantId} right after writing it ` +
          `(a concurrent run overwrote the list); re-merging (attempt ${attempt})`
      );
    }

    throw new Error(
      `statsig rule "${ruleName}" did not keep merchant ${merchantId} after ` +
        `${MAX_RULE_WRITE_ATTEMPTS} attempts: another run keeps overwriting its merchant_id list`
    );
  }

  /** True when the rule's `merchant_id` condition currently contains this merchant. */
  private async ruleTargetsMerchant(
    featureFlagID: FlagNames | string,
    ruleName: string,
    merchantId: string
  ): Promise<boolean> {
    const rules = await this.getFeatureFlagRules(featureFlagID as FlagNames);
    const rule = rules.find((r: StatsigRule) => r.name === ruleName);
    const targets = rule?.conditions?.find(
      (c: StatsigCondition) => c.field === 'merchant_id'
    )?.targetValue;
    return Boolean(targets?.includes(merchantId));
  }

  /**
   * Adds this run's merchant to the rule's `merchant_id` condition instead of replacing it.
   * Replacing evicted the merchant of any run in flight against the same rule (two parallel
   * repeats of the same spec, for instance), and the evicted run then silently stopped
   * matching the gate. The list is capped so it does not grow without bound across CI runs.
   */
  private mergeMerchantIds(rule: StatsigRule, merchantId: string): string[] {
    const current =
      rule.conditions?.find((c: StatsigCondition) => c.field === 'merchant_id')?.targetValue ?? [];
    const merged = [...current.filter((id: string) => id !== merchantId), merchantId];
    return merged.slice(-MAX_MERCHANTS_PER_RULE);
  }

  /**
   * Blocks until the rule this instance last wrote for `featureFlagID` can be relied on by
   * the service that reads the gate. Call it as late as possible — right before the action
   * the gate must affect — so the rest of the setup counts towards the propagation window
   * and the test only pays for whatever time is left. It returns immediately when the setup
   * already covered the window, so it costs nothing on the specs that are slow anyway.
   *
   * Each poll re-reads the rule and re-applies it when the merchant is no longer in the
   * `merchant_id` condition. Only a rule shared between merchants registers that re-apply,
   * since only that one can be evicted: `ensureCreateOrUpdateRule` writes the list wholesale,
   * so a run in flight against the same rule drops this one and the gate silently stops
   * matching. A rule named after its own merchant needs none of this.
   */
  async pollUntilRuleIsLive(
    featureFlagID: FlagNames | string,
    merchantId: string,
    options: {
      reapply?: () => Promise<void>;
      propagationMs?: number;
      pollIntervalMs?: number;
    } = {}
  ): Promise<void> {
    const written = this.lastRuleWrite.get(String(featureFlagID));
    expect(
      written,
      `no statsig rule was written for "${featureFlagID}" by this ConfigStatsig instance`
    ).toBeDefined();
    if (!written) return;

    const propagationMs = options.propagationMs ?? STATSIG_RULE_PROPAGATION_MS;
    const pollIntervalMs = options.pollIntervalMs ?? STATSIG_RULE_POLL_INTERVAL_MS;
    // The writer registers this when the rule can be evicted by another run; the option is
    // kept so a caller can still force it.
    const reapply = options.reapply ?? written.reapply;
    let deadline = written.at + propagationMs;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      if (!reapply) continue;

      if (await this.ruleTargetsMerchant(featureFlagID, written.name, merchantId)) continue;

      console.log(
        `[INFO] statsig rule "${written.name}" no longer targets ${merchantId}; re-applying it`
      );
      await reapply();
      deadline = (this.lastRuleWrite.get(String(featureFlagID))?.at ?? Date.now()) + propagationMs;
    }

    console.log(
      `[INFO] statsig rule "${written.name}" is live for merchant ${merchantId} ` +
        `(${Math.round((Date.now() - written.at) / 1000)}s after it was written)`
    );
  }

  async createFeatureFlagRuleWithKeys(
    keys: { key: string; value: any }[]
  ): Promise<{ status: number; ruleId: string }> {
    const featureFlagId = keys.find((k) => k.key === 'feature_flag_id')?.value as FlagNames;
    const ruleName = keys.find((k) => k.key === 'rule_id')?.value as string;
    const merchantId = keys.find((k) => k.key === 'merchant_id')?.value as string;
    const apiKey = getStatsigApiKey(featureFlagId);

    const statsigService = ServiceFactory.getService(SERVICE_KEYS.STATSIG, statsigURL);
    const response = await statsigService.createGateRule(apiKey, featureFlagId, {
      name: ruleName,
      passPercentage: 100,
      conditions: [
        {
          type: 'custom_field',
          targetValue: [merchantId],
          operator: 'any',
          field: 'merchant_id',
        },
      ],
      environments: ['development', 'staging'],
      id: ruleName,
      baseID: ruleName,
      returnValue: {},
    });

    const rules: any[] = (response.data as any)?.data?.rules || [];
    const rule = rules.find((r: any) => r.name === ruleName);
    const ruleId = rule?.id || '';
    if (ruleId) {
      this.markRuleWritten(featureFlagId, ruleName);
    }

    return { status: response.status, ruleId };
  }

  async deleteFeatureFlagRuleWithKeys(keys: { key: string; value: any }[]): Promise<void> {
    const featureFlagId = keys.find((k) => k.key === 'feature_flag_id')?.value as FlagNames;
    const ruleId = keys.find((k) => k.key === 'rule_id')?.value as string;
    const apiKey = getStatsigApiKey(featureFlagId);

    const statsigService = ServiceFactory.getService(SERVICE_KEYS.STATSIG, statsigURL);
    await statsigService.deleteGateRule(apiKey, featureFlagId, ruleId);
  }

  async addMerchantIDToUniqueFeatureGateRule(
    merchantID: string,
    featureGateName: string,
    statsigRuleName: string,
    passPercentage: string
  ): Promise<string> {
    const apiKey = getStatsigApiKey(featureGateName as FlagNames);
    const uniqueStatsigRuleName = this.uniqueRuleName(statsigRuleName, merchantID);
    console.log('Adding statsig rule: ' + uniqueStatsigRuleName);

    const statsigService = ServiceFactory.getService(SERVICE_KEYS.STATSIG, statsigURL);
    let rules: any[];
    try {
      const response = await statsigService.createGateRule(apiKey, featureGateName, {
        name: uniqueStatsigRuleName,
        passPercentage: Number(passPercentage),
        conditions: [
          {
            type: 'custom_field',
            targetValue: [merchantID],
            operator: 'any',
            field: 'merchant_id',
          },
        ],
        environments: ['development', 'staging'],
        returnValue: {},
      });
      rules = (response.data as any)?.data?.rules || [];
    } catch (error) {
      // On a gate with hundreds of rules Statsig takes 25-40s per write, stores the rule
      // and still answers 400 "Rule name is already in use" (or 409). The name embeds a
      // freshly created merchantId, so if it is on the gate now, this call wrote it.
      rules = await this.getFeatureFlagRules(featureGateName as FlagNames);
      if (!rules.some((r: any) => r.name === uniqueStatsigRuleName)) throw error;
      console.log(
        `[INFO] createGateRule errored but rule "${uniqueStatsigRuleName}" was stored: ${error}`
      );
    }

    const rule = rules.find((r: any) => r.name === uniqueStatsigRuleName);
    const ruleId = rule?.id || '';
    if (ruleId) {
      this.markRuleWritten(featureGateName, uniqueStatsigRuleName);
    }
    console.log('Created statsig rule: ' + uniqueStatsigRuleName + ' with id: ' + ruleId);
    return ruleId;
  }

  async deleteMerchantIDFromUniqueFeatureGateRule(
    featureGateName: string,
    statsigRuleID: string
  ): Promise<void> {
    const apiKey = getStatsigApiKey(featureGateName as FlagNames);
    if (!statsigRuleID) {
      console.log('[INFO] No statsig rule id to delete; the rule was never created');
      return;
    }
    console.log('Deleting statsig rule: ' + statsigRuleID);
    const statsigService = ServiceFactory.getService(SERVICE_KEYS.STATSIG, statsigURL);
    try {
      await statsigService.deleteGateRule(apiKey, featureGateName, statsigRuleID);
    } catch (error) {
      // Same slow-gate behaviour as on create: the delete lands and Statsig answers 409,
      // and the conflict retry then gets 404. Only a rule still on the gate is a failure.
      const rules = await this.getFeatureFlagRules(featureGateName as FlagNames);
      if (rules.some((r: any) => r.id === statsigRuleID)) throw error;
      console.log(`[INFO] deleteGateRule errored but rule ${statsigRuleID} is gone: ${error}`);
    }
  }

  async updateStatsigRuleConditions(
    featureGateName: string,
    ruleID: string,
    conditions: StatsigCondition[]
  ): Promise<void> {
    const apiKey = getStatsigApiKey(featureGateName as FlagNames);
    const statsigService = ServiceFactory.getService(SERVICE_KEYS.STATSIG, statsigURL);
    await statsigService.updateGateRule(apiKey, featureGateName, ruleID, {
      id: ruleID,
      conditions,
    });
  }

  async addMerchantIDToFirstRuleCondition(
    rule: StatsigRule,
    featureGateName: string,
    merchantId: string
  ) {
    if (rule.conditions[0].targetValue.includes(merchantId)) {
      console.log('merchant_id: ' + merchantId + ' already exists in statsig rule: ' + rule.name);
      return rule;
    }

    rule.conditions[0].targetValue.push(merchantId);
    await this.updateStatsigRuleConditions(featureGateName, rule.id, rule.conditions);
    console.log('merchant_id: ' + merchantId + ' added to statsig rule: ' + rule.name);
  }

  async removeMerchantIDFromFirstRuleCondition(
    rule: StatsigRule,
    featureGateName: string,
    merchantId: string
  ) {
    if (!rule.conditions[0].targetValue.includes(merchantId)) {
      console.log('merchant_id: ' + merchantId + ' does not exist in statsig rule: ' + rule.name);
      return;
    }

    rule.conditions[0].targetValue = rule.conditions[0].targetValue.filter(
      (id: string) => id !== merchantId
    );
    await this.updateStatsigRuleConditions(featureGateName, rule.id, rule.conditions);
    console.log('merchant_id: ' + merchantId + ' removed from statsig rule: ' + rule.name);
  }

  async getRulesFromFeatureFlag(featureFlagName: FlagNames): Promise<StatsigRule[]> {
    const apiKey = getStatsigApiKey(featureFlagName);
    const statsigService = ServiceFactory.getService(SERVICE_KEYS.STATSIG, statsigURL);
    const response = await statsigService.getGateRules(apiKey, featureFlagName);

    const rules: StatsigRule[] = response.data?.data?.[0]?.rules || [];
    expect(rules.length).toBeGreaterThan(0);
    return rules;
  }

  getTargetValueFromRuleByRuleName(rules: StatsigRule[], ruleName: string): string[] {
    const rule = this.findRuleByRuleName(rules, ruleName);
    return rule.conditions[0].targetValue;
  }

  findRuleByRuleName(rules: StatsigRule[], ruleName: string): StatsigRule {
    return rules.find((rule: any) => rule.name === ruleName);
  }
}
