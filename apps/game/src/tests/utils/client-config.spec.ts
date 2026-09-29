import { expect, test } from '@jest/globals';
import { clientConfig, syncClientConfig } from 'src/config/client';

test('syncs page-specific asset configuration into the legacy client singleton', () => {
  const previousCdnPath = clientConfig.CDN_PATH;
  const previousLocalMode = clientConfig.launcherLocalAssetMode;
  try {
    syncClientConfig({
      ...clientConfig,
      CDN_PATH: 'boxplay://localhost/session',
      launcherLocalAssetMode: true,
    });

    expect(clientConfig.CDN_PATH).toBe('boxplay://localhost/session');
    expect(clientConfig.launcherLocalAssetMode).toBe(true);
  } finally {
    clientConfig.CDN_PATH = previousCdnPath;
    clientConfig.launcherLocalAssetMode = previousLocalMode;
  }
});
