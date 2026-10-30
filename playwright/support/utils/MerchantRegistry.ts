import * as fs from 'fs';
import * as path from 'path';

/**
 * Singleton class to track merchant IDs created during test execution
 * Uses append-only log for true thread-safety across multiple parallel workers
 * 
 * Architecture: Append-only log pattern
 * - Each worker appends merchant IDs to a log file (naturally atomic)
 * - No read-modify-write cycles (eliminates race conditions)
 * - Deduplication happens only once during teardown
 * 
 * @example
 * ```typescript
 * const registry = MerchantRegistry.getInstance();
 * registry.register('merchant-123');
 * const allMerchants = registry.getAll();
 * registry.clear();
 * ```
 */
export class MerchantRegistry {
  private static instance: MerchantRegistry;
  private readonly logFilePath: string;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.logFilePath = path.join(process.cwd(), 'playwright', '.debug', 'merchant-registry.log');
    this.ensureDirectoryExists();
  }

  /**
   * Gets the singleton instance
   * @returns The MerchantRegistry instance
   */
  public static getInstance(): MerchantRegistry {
    if (!MerchantRegistry.instance) {
      MerchantRegistry.instance = new MerchantRegistry();
    }
    return MerchantRegistry.instance;
  }

  /**
   * Ensures the directory for the registry file exists
   */
  private ensureDirectoryExists(): void {
    const dir = path.dirname(this.logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Registers a merchant ID for tracking
   * Uses append-only write which is naturally atomic and thread-safe
   * @param merchantId - The merchant ID to register
   * @throws Error if merchantId is empty or invalid
   */
  public register(merchantId: string): void {
    if (!merchantId || typeof merchantId !== 'string') {
      throw new Error('Invalid merchant ID: must be a non-empty string');
    }

    const trimmedId = merchantId.trim();
    if (trimmedId.length === 0) {
      throw new Error('Invalid merchant ID: cannot be empty');
    }

    try {
      // Append-only write: naturally atomic, no race conditions
      // Each line contains: timestamp|merchantId
      const logEntry = `${new Date().toISOString()}|${trimmedId}\n`;
      fs.appendFileSync(this.logFilePath, logEntry, 'utf-8');
      console.log(`[MerchantRegistry] Registered merchant: ${trimmedId}`);
    } catch (error) {
      console.error(`[MerchantRegistry] Failed to register merchant ${trimmedId}:`, error);
      throw error;
    }
  }

  /**
   * Gets all registered merchant IDs
   * Reads the append-only log and deduplicates entries
   * @returns Array of unique merchant IDs
   */
  public getAll(): string[] {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }

      const content = fs.readFileSync(this.logFilePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      
      // Deduplicate merchant IDs using Set
      const merchantIds = new Set<string>();
      let validEntries = 0;
      let invalidEntries = 0;

      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length === 2) {
          const merchantId = parts[1].trim();
          if (merchantId) {
            merchantIds.add(merchantId);
            validEntries++;
          }
        } else {
          invalidEntries++;
        }
      }

      console.log(`[MerchantRegistry] Loaded ${merchantIds.size} unique merchants from ${validEntries} entries (${invalidEntries} invalid)`);
      return Array.from(merchantIds);
    } catch (error) {
      console.error('[MerchantRegistry] Failed to read log file:', error);
      return [];
    }
  }

  /**
   * Gets the count of registered merchants
   * @returns Number of unique registered merchants
   */
  public count(): number {
    return this.getAll().length;
  }

  /**
   * Checks if a merchant ID is registered
   * @param merchantId - The merchant ID to check
   * @returns True if registered, false otherwise
   */
  public has(merchantId: string): boolean {
    const allIds = this.getAll();
    return allIds.includes(merchantId);
  }

  /**
   * Clears all registered merchant IDs
   * This should typically be called after bulk deletion
   */
  public clear(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        fs.unlinkSync(this.logFilePath);
      }
      console.log('[MerchantRegistry] Cleared all registered merchants');
    } catch (error) {
      console.error('[MerchantRegistry] Failed to clear registry file:', error);
    }
  }

  /**
   * Gets registry statistics
   * @returns Object with registry statistics
   */
  public getStats(): { total: number; filePath: string; exists: boolean; fileSizeBytes: number } {
    let fileSizeBytes = 0;
    try {
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        fileSizeBytes = stats.size;
      }
    } catch (error) {
      console.warn('[MerchantRegistry] Failed to get file stats:', error);
    }

    return {
      total: this.count(),
      filePath: this.logFilePath,
      exists: fs.existsSync(this.logFilePath),
      fileSizeBytes,
    };
  }
}
