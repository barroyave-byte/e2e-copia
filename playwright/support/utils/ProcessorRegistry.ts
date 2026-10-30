import * as fs from 'fs';
import * as path from 'path';

// Append-only log so parallel workers never race on read-modify-write.
// Format: timestamp|CREATED|processorId|merchantId|merchantToken
//         timestamp|DELETED|processorId
export interface OrphanedProcessor {
  processorId: string;
  merchantId: string;
  merchantToken: string;
}

export class ProcessorRegistry {
  private static instance: ProcessorRegistry;
  private readonly logFile: string;

  private constructor() {
    this.logFile = path.join(process.cwd(), 'playwright', '.debug', 'processor-registry.log');
    fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
  }

  static getInstance(): ProcessorRegistry {
    if (!ProcessorRegistry.instance) {
      ProcessorRegistry.instance = new ProcessorRegistry();
    }
    return ProcessorRegistry.instance;
  }

  register(processorId: string, merchantId: string, merchantToken: string) {
    if (!processorId) return;

    try {
      fs.appendFileSync(
        this.logFile,
        `${new Date().toISOString()}|CREATED|${processorId}|${merchantId}|${merchantToken}\n`,
        'utf-8'
      );
    } catch (error) {
      console.warn(`[ProcessorRegistry] register(${processorId}) failed:`, error);
    }
  }

  unregister(processorId: string) {
    if (!processorId) return;

    try {
      fs.appendFileSync(this.logFile, `${new Date().toISOString()}|DELETED|${processorId}\n`, 'utf-8');
    } catch (error) {
      console.warn(`[ProcessorRegistry] unregister(${processorId}) failed:`, error);
    }
  }

  getOrphaned(): OrphanedProcessor[] {
    if (!fs.existsSync(this.logFile)) return [];

    try {
      const created = new Map<string, OrphanedProcessor>();
      const deleted = new Set<string>();

      for (const line of fs.readFileSync(this.logFile, 'utf-8').split('\n')) {
        const parts = line.split('|');
        if (parts[1] === 'CREATED' && parts.length === 5) {
          created.set(parts[2], { processorId: parts[2], merchantId: parts[3], merchantToken: parts[4] });
        } else if (parts[1] === 'DELETED') {
          deleted.add(parts[2]);
        }
      }

      return Array.from(created.values()).filter(p => !deleted.has(p.processorId));
    } catch (error) {
      console.error('[ProcessorRegistry] getOrphaned() failed:', error);
      return [];
    }
  }

  clear() {
    try {
      if (fs.existsSync(this.logFile)) fs.unlinkSync(this.logFile);
    } catch (error) {
      console.warn('[ProcessorRegistry] clear() failed:', error);
    }
  }
}
