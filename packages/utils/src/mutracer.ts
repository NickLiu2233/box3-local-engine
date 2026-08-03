import { Logger } from './logger';
import { MuLogger } from '@box-local/mudb/logger';

export function createMuLogger(
  baseLogger: Logger,
  prefix = '@box-local/mudb/src',
): MuLogger {
  const logger = baseLogger.create(prefix);
  return {
    log: (x: string) => {},
    error: (x: string) => logger.error(x),
    exception: (x) => logger.error(x),
  };
}
