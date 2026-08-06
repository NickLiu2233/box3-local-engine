import axios from 'axios';
import type { Logger } from 'pino';

import type { ContentServer } from '@box-local/content-server';

/**
 * Local projects use one filesystem directory for both IPFS and OSS-style
 * content. Project-scoped directories do not necessarily contain blobs owned
 * by the separate local VOXA service, so both read paths need the same VOXA
 * fallback.
 */
export function createLocalContentWithVoxa(
  localContentServer: ContentServer,
  logger: Pick<Logger, 'debug'>,
  voxaURL = process.env.VOXA_INTERNAL_URL || process.env.VOXA_URL || '',
  retrieveVoxaBlob = async (hash: string) => {
    const response = await axios.get(
      `${voxaURL.replace(/\/$/, '')}/api/local/blobs/${encodeURIComponent(hash)}`,
      { responseType: 'arraybuffer', timeout: 30_000 },
    );
    return new Uint8Array(response.data);
  },
): ContentServer {
  return {
    init: () => localContentServer.init(),
    store: (content, options) => localContentServer.store(content, options),
    retrieve: async (hash, options) => {
      const local = await localContentServer.retrieve(hash, options);
      if (local || !voxaURL) return local;
      try {
        return await retrieveVoxaBlob(hash);
      } catch (error) {
        logger.debug(`local VOXA blob not found: ${hash}: ${String(error)}`);
        return undefined;
      }
    },
  };
}
