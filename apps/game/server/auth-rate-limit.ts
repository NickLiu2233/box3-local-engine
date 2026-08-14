export type AuthRateLimitScope = 'login' | 'registration';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function positiveInteger(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

function policy(scope: AuthRateLimitScope) {
  return scope === 'login'
    ? {
        maximum: positiveInteger(process.env.BOX_LOGIN_RATE_LIMIT_MAX_ATTEMPTS, 10, 10_000),
        windowMs: positiveInteger(process.env.BOX_LOGIN_RATE_LIMIT_WINDOW_MS, 5 * 60_000, 24 * 60 * 60_000),
      }
    : {
        maximum: positiveInteger(process.env.BOX_REGISTRATION_RATE_LIMIT_MAX_ATTEMPTS, 5, 10_000),
        windowMs: positiveInteger(process.env.BOX_REGISTRATION_RATE_LIMIT_WINDOW_MS, 60 * 60_000, 24 * 60 * 60_000),
      };
}

function key(scope: AuthRateLimitScope, address: string) {
  return `${scope}:${address}`;
}

export function checkAuthRateLimit(scope: AuthRateLimitScope, address: string, now = Date.now()) {
  const current = buckets.get(key(scope, address));
  const { maximum } = policy(scope);
  if (!current || current.resetAt <= now || current.count < maximum) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function recordAuthRateLimitAttempt(scope: AuthRateLimitScope, address: string, now = Date.now()) {
  const bucketKey = key(scope, address);
  const current = buckets.get(bucketKey);
  const { windowMs } = policy(scope);
  const active = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + windowMs };
  active.count += 1;
  buckets.set(bucketKey, active);
  return active;
}

export function resetAuthRateLimit(scope: AuthRateLimitScope, address: string) {
  buckets.delete(key(scope, address));
}

export function resetAuthRateLimitsForTests() {
  buckets.clear();
}
