import type { ClientConfig } from 'src/config/client';

const STORAGE_KEY = 'box-local-engine.remote-server';

export interface GameServerTarget {
  sessionURL: string;
  assetBaseURL: string;
  isRemote: boolean;
}

export function normalizeRemoteServerURL(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const fallbackProtocol =
    typeof location !== 'undefined' ? location.protocol : 'http:';
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${fallbackProtocol}//${trimmed}`;
  const parsed = new URL(withProtocol);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Server URL must use http or https');
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

export function rememberRemoteServerURL(value: string) {
  if (typeof window === 'undefined') {
    return;
  }
  const normalized = normalizeRemoteServerURL(value);
  if (normalized) {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function resolveGameServerTarget(
  config: Pick<
    ClientConfig,
    'mode' | 'ARENA_URL' | 'CDN_PATH' | 'remoteGameServerURL'
  >,
): GameServerTarget {
  const localTarget = (): GameServerTarget => {
    const arenaURL =
      typeof location === 'undefined' ||
      process.env.NEXT_PUBLIC_EXPORT_MODE === 'true'
        ? config.ARENA_URL
        : location.origin;
    return {
      sessionURL: `${arenaURL.replace(/\/$/, '')}/api/createSession`,
      assetBaseURL: config.CDN_PATH,
      isRemote: false,
    };
  };

  if (config.mode !== 'play' || typeof window === 'undefined') {
    return localTarget();
  }

  const queryValue = new URLSearchParams(window.location.search).get('server');
  if (queryValue === 'local') {
    window.localStorage.removeItem(STORAGE_KEY);
    return localTarget();
  }

  const configuredValue =
    queryValue ||
    config.remoteGameServerURL ||
    window.localStorage.getItem(STORAGE_KEY) ||
    '';
  if (!configuredValue) {
    return localTarget();
  }

  const baseURL = normalizeRemoteServerURL(configuredValue);
  if (queryValue) {
    window.localStorage.setItem(STORAGE_KEY, baseURL);
  }

  return {
    sessionURL: `${baseURL}/api/session`,
    assetBaseURL: baseURL,
    isRemote: true,
  };
}
