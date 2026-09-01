import type { NextApiRequest, NextApiResponse } from 'next';
import type { RuntimePlayerIdentity } from '@box-local/utils/local-player-identity';

type RuntimeIdentityResponse = {
  identity: RuntimePlayerIdentity;
  assertion: string;
};

export class PlayerAuthenticationRequiredError extends Error {
  constructor() {
    super('AUTH_REQUIRED');
    this.name = 'PlayerAuthenticationRequiredError';
  }
}

export class PlayerLoginURLNotConfiguredError extends Error {
  code = 'LOGIN_URL_NOT_CONFIGURED' as const;

  constructor() {
    super('服主尚未配置 BOX_PLAYER_LOGIN_URL，无法跳转到登录页面');
    this.name = 'PlayerLoginURLNotConfiguredError';
  }
}

function internalURL() {
  const value = (process.env.BOX_PLAYER_SERVICE_INTERNAL_URL || '').trim();
  if (!value) throw new Error('BOX_PLAYER_SERVICE_INTERNAL_URL is not configured');
  return value.replace(/\/$/, '');
}

function internalSecret() {
  const value = process.env.PERMISSION_TOKEN_SECRET || '';
  if (!value) throw new Error('PERMISSION_TOKEN_SECRET is required for player identity');
  return value;
}

function requestProtocol(req: NextApiRequest) {
  if (process.env.BOX_TRUST_PROXY === 'true') {
    const forwarded = req.headers['x-forwarded-proto'];
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded) || 'http';
  }
  return process.env.BOX_SERVER_PUBLIC_URL?.startsWith('https://') ? 'https' : 'http';
}

export async function resolvePlayerServiceIdentity(
  req: NextApiRequest,
  res: NextApiResponse,
  ip: string,
): Promise<RuntimeIdentityResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${internalURL()}/api/player-internal/runtime-identity`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${internalSecret()}`,
        Cookie: String(req.headers.cookie || ''),
        'X-Box-Player-IP': ip,
        'X-Box-Player-Proto': requestProtocol(req),
        'X-Box-Player-User-Agent': String(req.headers['user-agent'] || '').slice(0, 512),
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    const responseHeaders = response.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const setCookies = responseHeaders.getSetCookie?.() || [];
    if (setCookies.length) {
      res.setHeader('Set-Cookie', setCookies);
    } else {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) res.setHeader('Set-Cookie', setCookie);
    }
    const data = await response.json().catch(() => ({})) as Partial<RuntimeIdentityResponse> & { message?: string };
    if (!response.ok || !data.identity || !data.assertion) {
      if (response.status === 401 || data.message === 'AUTH_REQUIRED') {
        throw new PlayerAuthenticationRequiredError();
      }
      throw new Error(data.message || `玩家身份服务请求失败（HTTP ${response.status}）`);
    }
    return { identity: data.identity, assertion: data.assertion };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error('玩家身份服务响应超时');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function hasAuthenticatedPlayer(cookie = '', ip = '', userAgent = '') {
  try {
    await getAuthenticatedPlayerIdentity(cookie, ip, userAgent);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the current player identity for App Router pages, where no mutable
 * NextApiResponse is available to forward a renewed cookie. The identity is
 * always read from Player Service, so permission changes take effect on the
 * very next protected page request.
 */
export async function getAuthenticatedPlayerIdentity(cookie = '', ip = '', userAgent = '') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${internalURL()}/api/player-internal/runtime-identity`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${internalSecret()}`,
        Cookie: cookie,
        'X-Box-Player-IP': ip,
        'X-Box-Player-User-Agent': userAgent.slice(0, 512),
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({})) as Partial<RuntimeIdentityResponse> & {
      message?: string;
    };
    if (!response.ok || !data.identity || !data.assertion) {
      if (response.status === 401 || data.message === 'AUTH_REQUIRED') {
        throw new PlayerAuthenticationRequiredError();
      }
      throw new Error(data.message || `玩家身份服务请求失败（HTTP ${response.status}）`);
    }
    return { identity: data.identity, assertion: data.assertion };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error('玩家身份服务响应超时');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function publicApplicationURL(from: 'creator' | 'play') {
  const configured = from === 'creator'
    ? process.env.BOX_CREATOR_PUBLIC_URL
    : process.env.BOX_PLAY_PUBLIC_URL;
  const fallback = from === 'creator' ? 'http://127.0.0.1:3002' : 'http://127.0.0.1:3000';
  return new URL((configured || fallback).trim());
}

function trustedReturnURL(from: 'creator' | 'play', requestedReturnUrl?: string) {
  const application = publicApplicationURL(from);
  if (!requestedReturnUrl) return application.toString();
  try {
    const requested = new URL(requestedReturnUrl, application);
    return requested.origin === application.origin ? requested.toString() : application.toString();
  } catch {
    return application.toString();
  }
}

export function requirePlayerLoginURL(from: 'creator' | 'play', requestedReturnUrl?: string) {
  const configured = (process.env.BOX_PLAYER_LOGIN_URL || '').trim();
  if (!configured) throw new PlayerLoginURLNotConfiguredError();
  const login = new URL(configured);
  if (!['http:', 'https:'].includes(login.protocol)) {
    throw new Error('BOX_PLAYER_LOGIN_URL 只能使用 HTTP 或 HTTPS 地址');
  }
  login.searchParams.set('source', from);
  login.searchParams.set('returnUrl', trustedReturnURL(from, requestedReturnUrl));
  return login.toString();
}

export function playerLoginURL(from: 'creator' | 'play', requestedReturnUrl?: string) {
  try {
    return requirePlayerLoginURL(from, requestedReturnUrl);
  } catch (error) {
    if (!(error instanceof PlayerLoginURLNotConfiguredError)) throw error;
    const search = new URLSearchParams({ source: from });
    if (requestedReturnUrl) {
      search.set(
        'returnUrl',
        trustedReturnURL(from, requestedReturnUrl),
      );
    }
    return `/login-required?${search.toString()}`;
  }
}
