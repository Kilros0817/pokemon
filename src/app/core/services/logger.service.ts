import { Injectable, isDevMode } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  debug(message: string, ...optionalParams: unknown[]): void {
    if (isDevMode()) {
      console.debug(message, ...optionalParams);
    }
  }

  info(message: string, ...optionalParams: unknown[]): void {
    if (isDevMode()) {
      console.info(message, ...optionalParams);
    }
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    if (isDevMode()) {
      console.warn(message, ...optionalParams);
    }
  }

  error(message: string, ...optionalParams: unknown[]): void {
    console.error(message, ...optionalParams);
  }
}
