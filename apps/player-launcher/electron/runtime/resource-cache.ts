import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type { Session } from 'electron';

async function directoryBytes(root:string):Promise<number> {
    let stat;
    try {
        stat = await fs.lstat(root);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return 0;
        }
        throw error;
    }
    if (stat.isSymbolicLink()) {
        return 0;
    }
    if (stat.isFile()) {
        return stat.size;
    }
    if (!stat.isDirectory()) {
        return 0;
    }
    let bytes = 0;
    for (const entry of await fs.readdir(root)) {
        bytes += await directoryBytes(path.join(root, entry));
    }
    return bytes;
}

export async function readResourceCache(session:Session) {
    const root = session.getStoragePath();
    return {
        staticBytes: root
            ? await directoryBytes(path.join(root, 'Service Worker', 'CacheStorage'))
            : 0,
        httpBytes: await session.getCacheSize(),
    };
}

export async function clearResourceCache(session:Session):Promise<void> {
    await session.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
    await session.clearCache();
}
