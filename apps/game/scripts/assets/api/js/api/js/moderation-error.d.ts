
declare function moderationError(code: number, msg: string, status?: ModerationErrorStatus): ModerationError;
/** Normalize both current structured replies and legacy message-only transports. */
declare function normalizeModerationError(error: unknown, code?: number, fallback?: string): ModerationError;
