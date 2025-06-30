export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}

export class Logger {
  private static instance: Logger;
  private debugMode: boolean;

  private constructor() {
    this.debugMode = process.env['DEBUG'] === 'true';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  debug(message: string, data?: any): void {
    if (this.debugMode) {
      this.log('DEBUG', message, data);
    }
  }

  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }

  private log(level: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (data !== undefined) {
      entry.data = data;
    }

    // In production, you might want to send this to a logging service
    // For now, we'll just use console with appropriate formatting
    const logMessage = `[${entry.timestamp}] ${entry.level}: ${entry.message}`;

    if (entry.data) {
      console.error(logMessage, entry.data);
    } else {
      console.error(logMessage);
    }
  }
}

export const logger = Logger.getInstance();
