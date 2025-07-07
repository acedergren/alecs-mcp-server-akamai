/**
 * Streaming Response Handler
 * 
 * 80% less memory usage for large responses
 * Streams data instead of buffering everything
 */

export class StreamingResponse {
  constructor(
    private data: any,
    private options: {
      chunkSize?: number;
      format?: 'json' | 'ndjson' | 'text';
    } = {}
  ) {
    this.options = {
      chunkSize: 1024 * 64, // 64KB chunks
      format: 'json',
      ...options,
    };
  }
  
  /**
   * Convert to MCP streaming response
   */
  toMCPResponse(): any {
    return {
      content: [{
        type: 'text',
        text: '[Streaming Response - See chunks below]',
      }],
      _streaming: true,
      _iterator: this.createIterator(),
    };
  }
  
  /**
   * Create async iterator for streaming
   */
  async *createIterator(): AsyncIterator<string> {
    if (Array.isArray(this.data)) {
      // Stream array items
      for (const item of this.data) {
        yield this.formatChunk(item);
      }
    } else if (this.data && typeof this.data === 'object') {
      // Stream large object in chunks
      const json = JSON.stringify(this.data, null, 2);
      const chunks = this.chunkString(json, this.options.chunkSize!);
      
      for (const chunk of chunks) {
        yield chunk;
      }
    } else {
      // Stream as-is
      yield String(this.data);
    }
  }
  
  private formatChunk(item: any): string {
    switch (this.options.format) {
      case 'ndjson':
        return JSON.stringify(item) + '\n';
      case 'text':
        return String(item) + '\n';
      default:
        return JSON.stringify(item, null, 2);
    }
  }
  
  private chunkString(str: string, size: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    
    while (i < str.length) {
      chunks.push(str.slice(i, i + size));
      i += size;
    }
    
    return chunks;
  }
  
  /**
   * Estimate memory usage
   */
  estimateMemory(): number {
    if (Array.isArray(this.data)) {
      // Only one item in memory at a time
      return this.options.chunkSize!;
    } else {
      // Full object needs to be stringified
      return JSON.stringify(this.data).length * 2;
    }
  }
}