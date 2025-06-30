/**
 * Bloom Filter Implementation for Negative Cache
 * 
 * A space-efficient probabilistic data structure for testing set membership.
 * Used to quickly check if a key definitely doesn't exist in the cache.
 * 
 * Features:
 * - Configurable false positive rate
 * - Multiple hash functions for better distribution
 * - Bit array backed by Buffer for memory efficiency
 * - Zero external dependencies
 */

import { createHash } from 'crypto';

export class BloomFilter {
  private bitArray: Buffer;
  private size: number;
  private hashFunctions: number;
  private numElements: number = 0;
  
  /**
   * Create a new Bloom Filter
   * @param expectedElements - Expected number of elements
   * @param falsePositiveRate - Desired false positive rate (default: 0.01 = 1%)
   */
  constructor(expectedElements: number = 10000, falsePositiveRate: number = 0.01) {
    // Calculate optimal size and hash functions
    this.size = this.calculateOptimalSize(expectedElements, falsePositiveRate);
    this.hashFunctions = this.calculateOptimalHashFunctions(this.size, expectedElements);
    
    // Initialize bit array
    const byteSize = Math.ceil(this.size / 8);
    this.bitArray = Buffer.alloc(byteSize, 0);
  }
  
  /**
   * Add an element to the bloom filter
   */
  add(element: string): void {
    const positions = this.getHashPositions(element);
    
    for (const pos of positions) {
      const byteIndex = Math.floor(pos / 8);
      const bitIndex = pos % 8;
      if (this.bitArray[byteIndex] !== undefined) {
        this.bitArray[byteIndex] |= (1 << bitIndex);
      }
    }
    
    this.numElements++;
  }
  
  /**
   * Test if an element might be in the set
   * @returns false if definitely not in set, true if possibly in set
   */
  has(element: string): boolean {
    const positions = this.getHashPositions(element);
    
    for (const pos of positions) {
      const byteIndex = Math.floor(pos / 8);
      const bitIndex = pos % 8;
      
      if (this.bitArray[byteIndex] !== undefined && (this.bitArray[byteIndex] & (1 << bitIndex)) === 0) {
        return false; // Definitely not in set
      }
    }
    
    return true; // Possibly in set
  }
  
  /**
   * Clear the bloom filter
   */
  clear(): void {
    this.bitArray.fill(0);
    this.numElements = 0;
  }
  
  /**
   * Get current false positive probability based on actual usage
   */
  getCurrentFalsePositiveRate(): number {
    if (this.numElements === 0) return 0;
    
    // Formula: (1 - e^(-k*n/m))^k
    const ratio = -this.hashFunctions * this.numElements / this.size;
    return Math.pow(1 - Math.exp(ratio), this.hashFunctions);
  }
  
  /**
   * Get filter statistics
   */
  getStats(): {
    size: number;
    elements: number;
    hashFunctions: number;
    falsePositiveRate: number;
    memoryUsage: number;
  } {
    return {
      size: this.size,
      elements: this.numElements,
      hashFunctions: this.hashFunctions,
      falsePositiveRate: this.getCurrentFalsePositiveRate(),
      memoryUsage: this.bitArray.length
    };
  }
  
  /**
   * Calculate optimal bit array size
   */
  private calculateOptimalSize(n: number, p: number): number {
    // Formula: m = -n * ln(p) / (ln(2)^2)
    return Math.ceil(-n * Math.log(p) / (Math.log(2) * Math.log(2)));
  }
  
  /**
   * Calculate optimal number of hash functions
   */
  private calculateOptimalHashFunctions(m: number, n: number): number {
    // Formula: k = (m/n) * ln(2)
    return Math.max(1, Math.round((m / n) * Math.log(2)));
  }
  
  /**
   * Get hash positions for an element
   */
  private getHashPositions(element: string): number[] {
    const positions: number[] = [];
    
    // Use double hashing to generate k hash functions
    // h(i) = h1(x) + i * h2(x) mod m
    const hash1 = this.hash(element, 'sha256');
    const hash2 = this.hash(element, 'md5');
    
    for (let i = 0; i < this.hashFunctions; i++) {
      const hash = (hash1 + i * hash2) % this.size;
      positions.push(Math.abs(hash));
    }
    
    return positions;
  }
  
  /**
   * Generate hash value for element
   */
  private hash(element: string, algorithm: string): number {
    const hash = createHash(algorithm)
      .update(element)
      .digest();
    
    // Convert first 4 bytes to 32-bit integer
    return hash.readUInt32BE(0);
  }
  
  /**
   * Merge another bloom filter into this one
   * Note: Both filters must have the same size and hash functions
   */
  merge(other: BloomFilter): void {
    if (this.size !== other.size || this.hashFunctions !== other.hashFunctions) {
      throw new Error('Cannot merge bloom filters with different parameters');
    }
    
    // OR the bit arrays together
    for (let i = 0; i < this.bitArray.length; i++) {
      const thisBit = this.bitArray[i];
      const otherBit = other.bitArray[i];
      if (thisBit !== undefined && otherBit !== undefined) {
        this.bitArray[i] = thisBit | otherBit;
      }
    }
    
    this.numElements += other.numElements;
  }
  
  /**
   * Export bloom filter to buffer for persistence
   */
  toBuffer(): Buffer {
    const header = Buffer.alloc(16);
    header.writeUInt32BE(this.size, 0);
    header.writeUInt32BE(this.hashFunctions, 4);
    header.writeUInt32BE(this.numElements, 8);
    header.writeUInt32BE(this.bitArray.length, 12);
    
    return Buffer.concat([header, this.bitArray]);
  }
  
  /**
   * Import bloom filter from buffer
   */
  static fromBuffer(buffer: Buffer): BloomFilter {
    const size = buffer.readUInt32BE(0);
    const hashFunctions = buffer.readUInt32BE(4);
    const numElements = buffer.readUInt32BE(8);
    const bitArrayLength = buffer.readUInt32BE(12);
    
    const filter = Object.create(BloomFilter.prototype);
    filter.size = size;
    filter.hashFunctions = hashFunctions;
    filter.numElements = numElements;
    filter.bitArray = buffer.slice(16, 16 + bitArrayLength);
    
    return filter;
  }
}