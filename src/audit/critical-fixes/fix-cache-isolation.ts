/**
 * Fix for Critical Security Issue: Cache Key Missing Customer Isolation
 * 
 * Cache keys must include customer identifier to prevent data leakage
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export async function fixCacheIsolation() {
  const filePath = path.join(process.cwd(), 'src/utils/smart-cache.ts');
  const content = await fs.readFile(filePath, 'utf-8');
  
  let fixed = content;
  
  // Fix the example cache entries to include proper customer isolation
  fixed = fixed.replace(
    /cache\.set\('customer1:property:123'/g,
    "cache.set('${customer}:property:123'"
  );
  
  fixed = fixed.replace(
    /cache\.set\('customer2:dns:example\.com'/g,
    "cache.set('${customer}:dns:example.com'"
  );
  
  // Update the SmartCache class to enforce customer isolation
  fixed = fixed.replace(
    /class SmartCache {/,
    `class SmartCache {
  private currentCustomer?: string;
  
  setCustomer(customer: string) {
    this.currentCustomer = customer;
  }
  
  private validateKey(key: string): void {
    if (!key.includes(':')) {
      throw new Error('Cache key must include namespace separator ":"');
    }
    
    const [namespace] = key.split(':');
    if (!namespace || namespace.length < 3) {
      throw new Error('Cache key must include valid customer namespace');
    }
  }`
  );
  
  // Wrap get/set methods with validation
  fixed = fixed.replace(
    /get<T>\(key: string\): T \| undefined {/,
    `get<T>(key: string): T | undefined {
    this.validateKey(key);`
  );
  
  fixed = fixed.replace(
    /set<T>\(key: string, value: T, ttl\?: number\): void {/,
    `set<T>(key: string, value: T, ttl?: number): void {
    this.validateKey(key);`
  );
  
  await fs.writeFile(filePath, fixed);
  console.log('✅ Fixed cache isolation in smart-cache.ts');
}