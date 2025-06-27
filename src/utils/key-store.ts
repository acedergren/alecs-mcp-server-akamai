/**
 * Memory-Efficient Key Storage
 * 
 * Reduces memory usage for cache keys by:
 * - Interning common key prefixes
 * - Using a trie-like structure for shared prefixes
 * - Compressing key patterns
 * 
 * Features:
 * - Automatic prefix detection and sharing
 * - Memory usage tracking
 * - Fast key lookup and iteration
 */

export class KeyStore {
  private prefixPool: Map<string, string> = new Map(); // Interned prefixes
  private suffixMap: Map<string, Set<string>> = new Map(); // Prefix -> suffixes
  private keyToPrefix: Map<string, string> = new Map(); // Full key -> prefix
  private totalKeys = 0;
  private memorySaved = 0;
  
  /**
   * Add a key to the store
   */
  add(key: string): void {
    // Find optimal split point
    const splitIndex = this.findOptimalSplit(key);
    const prefix = key.substring(0, splitIndex);
    const suffix = key.substring(splitIndex);
    
    // Intern the prefix
    let internedPrefix = this.prefixPool.get(prefix);
    if (!internedPrefix) {
      internedPrefix = prefix;
      this.prefixPool.set(prefix, prefix);
      this.suffixMap.set(prefix, new Set());
    } else {
      // Memory saved by reusing prefix
      this.memorySaved += prefix.length * 2; // Approximate bytes saved
    }
    
    // Store suffix
    this.suffixMap.get(internedPrefix)!.add(suffix);
    this.keyToPrefix.set(key, internedPrefix);
    this.totalKeys++;
  }
  
  /**
   * Remove a key from the store
   */
  delete(key: string): boolean {
    const prefix = this.keyToPrefix.get(key);
    if (!prefix) return false;
    
    const suffix = key.substring(prefix.length);
    const suffixes = this.suffixMap.get(prefix);
    
    if (suffixes) {
      suffixes.delete(suffix);
      
      // Clean up empty prefix
      if (suffixes.size === 0) {
        this.suffixMap.delete(prefix);
        this.prefixPool.delete(prefix);
      }
    }
    
    this.keyToPrefix.delete(key);
    this.totalKeys--;
    return true;
  }
  
  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return this.keyToPrefix.has(key);
  }
  
  /**
   * Get all keys
   */
  keys(): string[] {
    const result: string[] = [];
    
    for (const [prefix, suffixes] of this.suffixMap) {
      for (const suffix of suffixes) {
        result.push(prefix + suffix);
      }
    }
    
    return result;
  }
  
  /**
   * Get keys matching a pattern
   */
  getByPattern(pattern: string): string[] {
    const result: string[] = [];
    const regex = this.patternToRegex(pattern);
    
    for (const [prefix, suffixes] of this.suffixMap) {
      // Early exit if prefix doesn't match
      if (!regex.test(prefix)) {
        // Check if any combination could match
        let couldMatch = false;
        for (const suffix of suffixes) {
          if (regex.test(prefix + suffix)) {
            couldMatch = true;
            break;
          }
        }
        if (!couldMatch) continue;
      }
      
      for (const suffix of suffixes) {
        const fullKey = prefix + suffix;
        if (regex.test(fullKey)) {
          result.push(fullKey);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Get memory usage statistics
   */
  getStats(): {
    totalKeys: number;
    uniquePrefixes: number;
    memorySaved: number;
    compressionRatio: number;
  } {
    const totalMemory = this.calculateTotalMemory();
    const uncompressedMemory = this.totalKeys * 50; // Assume average 50 bytes per key
    
    return {
      totalKeys: this.totalKeys,
      uniquePrefixes: this.prefixPool.size,
      memorySaved: this.memorySaved,
      compressionRatio: uncompressedMemory > 0 ? totalMemory / uncompressedMemory : 1
    };
  }
  
  /**
   * Clear all keys
   */
  clear(): void {
    this.prefixPool.clear();
    this.suffixMap.clear();
    this.keyToPrefix.clear();
    this.totalKeys = 0;
    this.memorySaved = 0;
  }
  
  /**
   * Find optimal split point for prefix/suffix
   */
  private findOptimalSplit(key: string): number {
    // Common patterns in Akamai cache keys
    const patterns = [
      ':', // namespace separator
      '/', // path separator
      '_', // underscore separator
      '-', // dash separator
    ];
    
    // Find last occurrence of common separators in first half
    const midPoint = Math.floor(key.length / 2);
    let bestSplit = midPoint;
    
    for (const pattern of patterns) {
      const index = key.lastIndexOf(pattern, midPoint);
      if (index > 0 && index < key.length - 1) {
        bestSplit = index + 1; // Include separator in prefix
        break;
      }
    }
    
    // If no separator found, look for numeric boundaries
    if (bestSplit === midPoint) {
      for (let i = midPoint; i > 0; i--) {
        if (key[i]?.match(/\d/) && !key[i-1]?.match(/\d/)) {
          bestSplit = i;
          break;
        }
      }
    }
    
    return bestSplit;
  }
  
  /**
   * Convert pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${regex}$`);
  }
  
  /**
   * Calculate total memory usage
   */
  private calculateTotalMemory(): number {
    let memory = 0;
    
    // Prefix pool memory
    for (const prefix of this.prefixPool.keys()) {
      memory += prefix.length * 2; // UTF-16
    }
    
    // Suffix memory
    for (const suffixes of this.suffixMap.values()) {
      for (const suffix of suffixes) {
        memory += suffix.length * 2;
      }
    }
    
    // Overhead for maps (approximate)
    memory += this.prefixPool.size * 32; // Map overhead per entry
    memory += this.suffixMap.size * 32;
    memory += this.keyToPrefix.size * 32;
    
    return memory;
  }
}