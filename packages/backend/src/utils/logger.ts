export interface LogContext {
  requestId?: string;
  userId?: string;
  universidadId?: string;
  operation?: string;
  [key: string]: any;
}

export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      data
    };

    console.log(JSON.stringify(logEntry));
  }

  info(message: string, data?: any): void {
    this.formatMessage('INFO', message, data);
  }

  warn(message: string, data?: any): void {
    this.formatMessage('WARN', message, data);
  }

  error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;

    this.formatMessage('ERROR', message, errorData);
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      this.formatMessage('DEBUG', message, data);
    }
  }

  withContext(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }
}

export const createLogger = (context?: LogContext): Logger => {
  return new Logger(context);
};