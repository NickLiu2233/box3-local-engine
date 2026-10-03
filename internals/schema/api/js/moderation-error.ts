import type { ModerationError, ModerationErrorStatus } from './moderation'

const statuses: Record<number, ModerationErrorStatus> = {
  400: 'MODERATION_PARAMS_INVALID',
  401: 'MODERATION_AUTH_REQUIRED',
  403: 'MODERATION_FORBIDDEN',
  404: 'MODERATION_NOT_FOUND',
  409: 'MODERATION_CONFLICT',
  429: 'MODERATION_RATE_LIMITED',
  503: 'MODERATION_UNAVAILABLE',
  504: 'MODERATION_TIMEOUT',
}

export function moderationError(code: number, msg: string, status?: ModerationErrorStatus): ModerationError {
  return { status: status || statuses[code] || 'MODERATION_INTERNAL_ERROR', code, msg }
}

/** Normalize both current structured replies and legacy message-only transports. */
export function normalizeModerationError(error: unknown, code = 503, fallback = '地图管理服务暂时不可用'): ModerationError {
  if (error && typeof error === 'object') {
    const value = error as { status?: unknown; code?: unknown; msg?: unknown; message?: unknown }
    if (typeof value.status === 'string' &&
      [...Object.values(statuses), 'MODERATION_RESPONSE_INVALID', 'MODERATION_INTERNAL_ERROR'].includes(value.status as ModerationErrorStatus) &&
      typeof value.code === 'number' && Number.isInteger(value.code) && typeof value.msg === 'string') {
      return { status: value.status as ModerationErrorStatus, code: value.code, msg: value.msg }
    }
    return moderationError(code, typeof value.message === 'string' ? value.message : fallback)
  }
  return moderationError(code, fallback)
}
