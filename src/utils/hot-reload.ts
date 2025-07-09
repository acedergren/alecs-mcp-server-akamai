/**
 * Hot Reload Utility for Development Mode
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Development experience enhancement through hot reload
 * Approach: File watching with graceful restart and state preservation
 * Implementation: TypeScript-aware reloading with proper cleanup
 */

import { watch } from 'fs';
import { join } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { createLogger } from './pino-logger';
import clearModule from 'clear-module';

const logger = createLogger('hot-reload');

export interface HotReloadConfig {
  /**
   * Directories to watch for changes
   */
  watchDirs: string[];
  
  /**
   * File extensions to watch
   */
  extensions: string[];
  
  /**
   * Delay before restarting (debounce)
   */
  debounceMs: number;
  
  /**
   * Command to run
   */
  command: string;
  
  /**
   * Command arguments
   */
  args: string[];
  
  /**
   * Environment variables
   */
  env?: NodeJS.ProcessEnv;
  
  /**
   * Callback on restart
   */
  onRestart?: () => void;
}

export class HotReloadManager {
  private config: HotReloadConfig;
  private currentProcess: ChildProcess | null = null;
  private restartTimer: NodeJS.Timeout | null = null;
  private watchers: Map<string, any> = new Map();
  private isShuttingDown = false;

  constructor(config: HotReloadConfig) {
    this.config = {
      ...config,
      debounceMs: config.debounceMs || 500,
      extensions: config.extensions || ['.ts', '.js', '.json']
    };
    
    // Handle process termination
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Start the hot reload manager
   */
  async start(): Promise<void> {
    logger.info('Starting hot reload manager...');
    
    // Start the initial process
    await this.startProcess();
    
    // Set up file watchers
    this.setupWatchers();
    
    logger.info('Hot reload manager started successfully');
  }

  /**
   * Set up file watchers for the configured directories
   */
  private setupWatchers(): void {
    for (const dir of this.config.watchDirs) {
      const watcher = watch(
        dir,
        { recursive: true },
        (_eventType, filename) => {
          if (filename && this.shouldReload(filename)) {
            this.scheduleRestart(filename);
          }
        }
      );
      
      this.watchers.set(dir, watcher);
      logger.debug({ dir }, 'Watching directory for changes');
    }
  }

  /**
   * Check if a file change should trigger a reload
   */
  private shouldReload(filename: string): boolean {
    // Check if file has a watched extension
    const hasWatchedExtension = this.config.extensions.some(ext => 
      filename.endsWith(ext)
    );
    
    // Ignore test files and build artifacts
    const isIgnored = filename.includes('__tests__') || 
                     filename.includes('dist/') ||
                     filename.includes('node_modules/') ||
                     filename.includes('.git/');
    
    return hasWatchedExtension && !isIgnored;
  }

  /**
   * Schedule a restart with debouncing
   */
  private scheduleRestart(filename: string): void {
    logger.info({ filename }, 'File changed, scheduling restart...');
    
    // Clear existing timer
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
    }
    
    // Schedule new restart
    this.restartTimer = setTimeout(() => {
      this.restart(filename);
    }, this.config.debounceMs);
  }

  /**
   * Restart the process
   */
  private async restart(changedFile: string): Promise<void> {
    logger.info({ changedFile }, 'Restarting process...');
    
    // Clear module cache for the changed file
    try {
      const fullPath = join(process.cwd(), changedFile);
      clearModule(fullPath);
      clearModule.all();
    } catch (error) {
      logger.debug({ error }, 'Failed to clear module cache');
    }
    
    // Call onRestart callback if provided
    if (this.config.onRestart) {
      this.config.onRestart();
    }
    
    // Stop current process
    await this.stopProcess();
    
    // Start new process
    await this.startProcess();
    
    logger.info('Process restarted successfully');
  }

  /**
   * Start the managed process
   */
  private async startProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.debug({ 
        command: this.config.command, 
        args: this.config.args 
      }, 'Starting process...');
      
      this.currentProcess = spawn(this.config.command, this.config.args, {
        stdio: 'inherit',
        env: {
          ...process.env,
          ...this.config.env,
          NODE_ENV: 'development',
          HOT_RELOAD: 'true'
        }
      });
      
      this.currentProcess.on('error', (error) => {
        logger.error({ error }, 'Process error');
        reject(error);
      });
      
      this.currentProcess.on('exit', (code, signal) => {
        logger.debug({ code, signal }, 'Process exited');
        this.currentProcess = null;
        
        // If not shutting down and process exits unexpectedly, restart
        if (!this.isShuttingDown && code !== 0) {
          logger.warn('Process exited unexpectedly, restarting...');
          setTimeout(() => this.startProcess(), 1000);
        }
      });
      
      // Consider process started after a short delay
      setTimeout(resolve, 100);
    });
  }

  /**
   * Stop the current process
   */
  private async stopProcess(): Promise<void> {
    if (!this.currentProcess) {
      return;
    }
    
    return new Promise((resolve) => {
      logger.debug('Stopping current process...');
      
      const killTimer = setTimeout(() => {
        logger.warn('Process did not exit gracefully, forcing kill...');
        if (this.currentProcess) {
          this.currentProcess.kill('SIGKILL');
        }
      }, 5000);
      
      if (this.currentProcess) {
        this.currentProcess.once('exit', () => {
          clearTimeout(killTimer);
          this.currentProcess = null;
          resolve();
        });
        
        // Try graceful shutdown first
        this.currentProcess.kill('SIGTERM');
      } else {
        clearTimeout(killTimer);
        resolve();
      }
    });
  }

  /**
   * Shutdown the hot reload manager
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    logger.info('Shutting down hot reload manager...');
    this.isShuttingDown = true;
    
    // Clear restart timer
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
    }
    
    // Close all watchers
    for (const [dir, watcher] of this.watchers) {
      watcher.close();
      logger.debug({ dir }, 'Closed watcher');
    }
    this.watchers.clear();
    
    // Stop current process
    await this.stopProcess();
    
    logger.info('Hot reload manager shut down');
    process.exit(0);
  }
}

/**
 * Create and start a hot reload manager with default configuration
 */
export async function startHotReload(): Promise<HotReloadManager> {
  const config: HotReloadConfig = {
    watchDirs: ['src'],
    extensions: ['.ts', '.js', '.json'],
    debounceMs: 500,
    command: 'npm',
    args: ['run', 'dev:server'],
    env: {
      NODE_ENV: 'development',
      HOT_RELOAD: 'true'
    },
    onRestart: () => {
      logger.info('🔄 Hot reload triggered - recompiling...');
    }
  };
  
  const manager = new HotReloadManager(config);
  await manager.start();
  
  return manager;
}