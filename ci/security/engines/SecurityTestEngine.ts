/**
 * Base Security Test Engine
 */

export class SecurityTestEngine {
  protected testName: string;
  protected startTime: number;

  constructor(testName: string) {
    this.testName = testName;
    this.startTime = Date.now();
  }

  protected logStart(message: string): void {
    console.log(`🔧 [${this.testName}] ${message}`);
  }

  protected logProgress(message: string): void {
    console.log(`  ▶ ${message}`);
  }

  protected logSuccess(message: string): void {
    console.log(`  ✅ ${message}`);
  }

  protected logWarning(message: string): void {
    console.log(`  ⚠️ ${message}`);
  }

  protected logError(message: string): void {
    console.error(`  ❌ ${message}`);
  }

  protected getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}