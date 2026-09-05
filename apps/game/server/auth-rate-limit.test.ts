import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import {
  checkAuthRateLimit,
  recordAuthRateLimitAttempt,
  resetAuthRateLimit,
  resetAuthRateLimitsForTests,
} from './auth-rate-limit';

beforeEach(resetAuthRateLimitsForTests);
afterEach(() => {
  delete process.env.BOX_LOGIN_RATE_LIMIT_MAX_ATTEMPTS;
  delete process.env.BOX_LOGIN_RATE_LIMIT_WINDOW_MS;
  resetAuthRateLimitsForTests();
});

describe('authentication rate limits', () => {
  test('blocks login after the configured number of failures', () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(checkAuthRateLimit('login', '203.0.113.1', 1_000).allowed).toBe(true);
      recordAuthRateLimitAttempt('login', '203.0.113.1', 1_000);
    }
    expect(checkAuthRateLimit('login', '203.0.113.1', 1_000)).toEqual({
      allowed: false,
      retryAfterSeconds: 300,
    });
  });

  test('expires a window and resets a successful login', () => {
    process.env.BOX_LOGIN_RATE_LIMIT_MAX_ATTEMPTS = '1';
    process.env.BOX_LOGIN_RATE_LIMIT_WINDOW_MS = '1000';
    recordAuthRateLimitAttempt('login', '203.0.113.2', 5_000);
    expect(checkAuthRateLimit('login', '203.0.113.2', 5_500).allowed).toBe(false);
    expect(checkAuthRateLimit('login', '203.0.113.2', 6_000).allowed).toBe(true);
    recordAuthRateLimitAttempt('login', '203.0.113.2', 7_000);
    resetAuthRateLimit('login', '203.0.113.2');
    expect(checkAuthRateLimit('login', '203.0.113.2', 7_000).allowed).toBe(true);
  });
});
