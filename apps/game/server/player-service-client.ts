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
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function playerAccountURL(from: 'creator' | 'play') {
  const base = (process.env.BOX_PLAYER_SERVICE_PUBLIC_URL || 'http://127.0.0.1:3213').replace(/\/$/, '');
  return `${base}/account?from=${from}`;
}
