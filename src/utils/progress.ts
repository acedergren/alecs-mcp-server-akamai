import { EventEmitter } from 'events';

export interface ProgressOptions {
  total?: number;
  format?: string;
  barCompleteChar?: string;
  barIncompleteChar?: string;
  barWidth?: number;
  stream?: NodeJS.WriteStream;
  clear?: boolean;
}

export interface ProgressUpdate {
  current: number;
  total?: number;
  message?: string;
  status?: 'running' | 'success' | 'error' | 'warning';
}

export class ProgressBar extends EventEmitter {
  private current: number = 0;
  private total: number;
  private startTime: number;
  private format: string;
  private barCompleteChar: string;
  private barIncompleteChar: string;
  private barWidth: number;
  private stream: NodeJS.WriteStream;
  private clear: boolean;
  private lastDrawnLength: number = 0;

  constructor(options: ProgressOptions = {}) {
    super();
    this.total = options.total || 100;
    this.format = options.format || '[:bar] :percent :message';
    this.barCompleteChar = options.barCompleteChar || '█';
    this.barIncompleteChar = options.barIncompleteChar || '░';
    this.barWidth = options.barWidth || 40;
    this.stream = options.stream || process.stdout;
    this.clear = options.clear !== false;
    this.startTime = Date.now();
  }

  update(update: ProgressUpdate): void {
    this.current = update.current;
    if (update.total !== undefined) {
      this.total = update.total;
    }
    this.render(update.message || '', update.status);
  }

  increment(delta: number = 1, message?: string): void {
    this.current += delta;
    this.render(message || '');
  }

  finish(message?: string): void {
    this.current = this.total;
    this.render(message || 'Complete', 'success');
    if (this.clear) {
      this.stream.write('\n');
    }
  }

  private render(message: string, status?: string): void {
    const percent = Math.min(100, Math.floor((this.current / this.total) * 100));
    const filledLength = Math.floor((percent / 100) * this.barWidth);
    const emptyLength = this.barWidth - filledLength;
    
    const bar = this.barCompleteChar.repeat(filledLength) + 
                this.barIncompleteChar.repeat(emptyLength);
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.current / elapsed;
    const eta = this.total > 0 ? (this.total - this.current) / rate : 0;
    
    let output = this.format
      .replace(':bar', bar)
      .replace(':percent', `${percent}%`)
      .replace(':current', this.current.toString())
      .replace(':total', this.total.toString())
      .replace(':elapsed', this.formatTime(elapsed))
      .replace(':eta', this.formatTime(eta))
      .replace(':rate', rate.toFixed(2))
      .replace(':message', message);
    
    // Add color based on status
    if (status) {
      output = this.colorize(output, status);
    }
    
    // Clear previous line
    if (this.lastDrawnLength > 0) {
      this.stream.write('\r' + ' '.repeat(this.lastDrawnLength) + '\r');
    }
    
    this.stream.write(output);
    this.lastDrawnLength = output.length;
  }

  private formatTime(seconds: number): string {
    if (!isFinite(seconds)) return '∞';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h${minutes}m${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  private colorize(text: string, status: string): string {
    const colors: Record<string, string> = {
      running: '\x1b[36m', // cyan
      success: '\x1b[32m', // green
      error: '\x1b[31m',   // red
      warning: '\x1b[33m', // yellow
    };
    const reset = '\x1b[0m';
    return `${colors[status] || ''}${text}${reset}`;
  }
}

export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private current = 0;
  private interval: NodeJS.Timeout | null = null;
  private stream: NodeJS.WriteStream;
  private lastMessage: string = '';

  constructor(stream: NodeJS.WriteStream = process.stdout) {
    this.stream = stream;
  }

  start(message: string): void {
    this.stop();
    this.lastMessage = message;
    this.interval = setInterval(() => {
      this.stream.write(`\r${this.frames[this.current]} ${message}`);
      this.current = (this.current + 1) % this.frames.length;
    }, 80);
  }

  update(message: string): void {
    this.lastMessage = message;
  }

  succeed(message?: string): void {
    this.stop();
    this.stream.write(`\r✅ ${message || this.lastMessage}\n`);
  }

  fail(message?: string): void {
    this.stop();
    this.stream.write(`\r❌ ${message || this.lastMessage}\n`);
  }

  warn(message?: string): void {
    this.stop();
    this.stream.write(`\r⚠️  ${message || this.lastMessage}\n`);
  }

  info(message?: string): void {
    this.stop();
    this.stream.write(`\rℹ️  ${message || this.lastMessage}\n`);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.stream.write('\r' + ' '.repeat(this.lastMessage.length + 3) + '\r');
    }
  }
}

export class MultiProgress {
  private bars: Map<string, ProgressBar> = new Map();
  private spinners: Map<string, Spinner> = new Map();
  private stream: NodeJS.WriteStream;

  constructor(stream: NodeJS.WriteStream = process.stdout) {
    this.stream = stream;
  }

  addBar(id: string, options: ProgressOptions): ProgressBar {
    const bar = new ProgressBar({ ...options, stream: this.stream });
    this.bars.set(id, bar);
    return bar;
  }

  addSpinner(id: string): Spinner {
    const spinner = new Spinner(this.stream);
    this.spinners.set(id, spinner);
    return spinner;
  }

  getBar(id: string): ProgressBar | undefined {
    return this.bars.get(id);
  }

  getSpinner(id: string): Spinner | undefined {
    return this.spinners.get(id);
  }

  remove(id: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.stop();
      this.spinners.delete(id);
    }
    this.bars.delete(id);
  }

  clear(): void {
    this.spinners.forEach(spinner => spinner.stop());
    this.spinners.clear();
    this.bars.clear();
  }
}

// Utility functions for common progress patterns
export function withProgress<T>(
  task: () => Promise<T>,
  message: string,
  options?: { showSpinner?: boolean }
): Promise<T> {
  if (options?.showSpinner !== false) {
    const spinner = new Spinner();
    spinner.start(message);
    
    return task()
      .then(result => {
        spinner.succeed(`${message} - Done`);
        return result;
      })
      .catch(error => {
        spinner.fail(`${message} - Failed`);
        throw error;
      });
  }
  
  return task();
}

export async function trackProgress<T>(
  items: T[],
  processor: (item: T, index: number) => Promise<void>,
  options: {
    message?: string;
    format?: string;
    concurrent?: number;
  } = {}
): Promise<void> {
  const progress = new ProgressBar({
    total: items.length,
    format: options.format || '[:bar] :percent :current/:total :message'
  });

  const concurrent = options.concurrent || 1;
  let index = 0;

  async function processNext(): Promise<void> {
    if (index >= items.length) return;
    
    const currentIndex = index++;
    const item = items[currentIndex];
    
    if (item === undefined) {
      return processNext();
    }
    
    try {
      await processor(item, currentIndex);
      progress.increment(1, options.message || `Processing item ${currentIndex + 1}`);
    } catch (error) {
      progress.update({
        current: progress['current'],
        message: `Error processing item ${currentIndex + 1}`,
        status: 'error'
      });
      throw error;
    }
  }

  const workers = Array(Math.min(concurrent, items.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);
  progress.finish('All items processed');
}

// Console formatting utilities
export const format = {
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
  italic: (text: string) => `\x1b[3m${text}\x1b[0m`,
  underline: (text: string) => `\x1b[4m${text}\x1b[0m`,
  
  // Colors
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  
  // Background colors
  bgRed: (text: string) => `\x1b[41m${text}\x1b[0m`,
  bgGreen: (text: string) => `\x1b[42m${text}\x1b[0m`,
  bgYellow: (text: string) => `\x1b[43m${text}\x1b[0m`,
  bgBlue: (text: string) => `\x1b[44m${text}\x1b[0m`,
  bgMagenta: (text: string) => `\x1b[45m${text}\x1b[0m`,
  bgCyan: (text: string) => `\x1b[46m${text}\x1b[0m`,
  bgWhite: (text: string) => `\x1b[47m${text}\x1b[0m`,
};

// Status icons
export const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  debug: '🐛',
  time: '⏱️',
  rocket: '🚀',
  package: '📦',
  globe: '🌍',
  lock: '🔒',
  key: '🔑',
  cloud: '☁️',
  server: '🖥️',
  database: '🗄️',
  network: '🌐',
  certificate: '📜',
  dns: '🔍',
  check: '✓',
  cross: '✗',
  arrow: '→',
  bullet: '•',
  shield: '🛡️',
  sync: '🔄',
  contract: '📃',
  dot: '•',
  version: '📌',
  bulk: '📦',
  list: '📋',
  file: '📄',
  folder: '📁',
  link: '🔗',
  email: '📧',
  sparkle: '✨',
  unlock: '🔓',
  question: '❓'
};