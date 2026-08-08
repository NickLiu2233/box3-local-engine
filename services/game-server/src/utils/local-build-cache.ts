import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

import type { BuildCacheAPI } from '@box-local/build-system/type';

type CacheData = Record<string, string>;

/**
 * Local counterpart of boxes' persistent build-cache service.
 *
 * A runtime process is disposable, but its project directory is not. Keeping
 * the task-token -> result-hash mapping beside the project lets unchanged
 * projects reuse prebake results after creator/runtime restarts.
 */
export class LocalBuildCache implements BuildCacheAPI {
  private readonly pending = new Map<string, Promise<string>>();

  constructor(private readonly filename: string) {}

  private token(name: string, params: any[]) {
    return createHash('sha1')
      .update(JSON.stringify([name, params]))
      .digest('hex');
  }

  private read(): CacheData {
    try {
      const data = JSON.parse(fs.readFileSync(this.filename, 'utf8'));
      return data && typeof data === 'object' ? data : {};
    } catch {
      return {};
    }
  }

  private write(data: CacheData) {
    fs.mkdirSync(path.dirname(this.filename), { recursive: true });
    const temporary = `${this.filename}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(data));
    fs.renameSync(temporary, this.filename);
  }

  public async retrieve(name: string, params: any[]): Promise<string> {
    return this.read()[this.token(name, params)] || '';
  }

  public async store(
    name: string,
    params: any[],
    method: () => Promise<string>,
  ): Promise<string> {
    const token = this.token(name, params);
    const cached = this.read()[token];
    if (cached) return cached;

    const current = this.pending.get(token);
    if (current) return current;

    const task = method().then((result) => {
      const latest = this.read();
      latest[token] = result;
      this.write(latest);
      return result;
    });
    this.pending.set(token, task);
    try {
      return await task;
    } finally {
      this.pending.delete(token);
    }
  }
}
