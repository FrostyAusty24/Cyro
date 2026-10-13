import type { LogLevel } from './config.js';

const ranks: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export class Logger {
  public constructor(private readonly level: LogLevel) {}

  debug(message: string, details?: unknown): void { this.write('debug', message, details); }
  info(message: string, details?: unknown): void { this.write('info', message, details); }
  warn(message: string, details?: unknown): void { this.write('warn', message, details); }
  error(message: string, details?: unknown): void { this.write('error', message, details); }

  private write(level: LogLevel, message: string, details?: unknown): void {
    if (ranks[level] < ranks[this.level]) return;
    const entry = { time: new Date().toISOString(), level, message, ...(details === undefined ? {} : { details }) };
    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  }
}
