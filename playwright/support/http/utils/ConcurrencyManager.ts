// Concurrency management utilities for parallel test execution
export class ConcurrencyManager {
  private static instance: ConcurrencyManager;
  private concurrentRequests: number = 0;
  private requestQueue: Array<() => void> = [];
  private maxConcurrentRequests: number;

  private constructor(maxConcurrentRequests: number = 50) {
    this.maxConcurrentRequests = maxConcurrentRequests;
  }

  static getInstance(maxConcurrentRequests?: number): ConcurrencyManager {
    if (!ConcurrencyManager.instance) {
      ConcurrencyManager.instance = new ConcurrencyManager(maxConcurrentRequests);
    }
    return ConcurrencyManager.instance;
  }

  async executeWithConcurrencyLimit<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const executeOperation = async () => {
        this.concurrentRequests++;
        
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.concurrentRequests--;
          this.processQueue();
        }
      };

      if (this.concurrentRequests < this.maxConcurrentRequests) {
        executeOperation();
      } else {
        this.requestQueue.push(executeOperation);
      }
    });
  }

  private processQueue(): void {
    if (this.requestQueue.length > 0 && this.concurrentRequests < this.maxConcurrentRequests) {
      const nextOperation = this.requestQueue.shift();
      if (nextOperation) {
        nextOperation();
      }
    }
  }

  getStats(): { concurrent: number; queued: number } {
    return {
      concurrent: this.concurrentRequests,
      queued: this.requestQueue.length
    };
  }
}
