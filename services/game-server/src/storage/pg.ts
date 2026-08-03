import { Pool, PoolClient } from 'pg';
import * as Cursor from 'pg-cursor';
import { CommonSQL, CommonDatabase } from './types';

export interface PGConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export class PGSQL implements CommonSQL {
  private pool: Pool;

  constructor(config: PGConfig, private resumeDatabase: () => any) {
    this.pool = new Pool({
      ...config,
      connectionTimeoutMillis: 60 * 1000,
      idleTimeoutMillis: 0,
      keepAliveInitialDelayMillis: 1000,
      keepAlive: true,
      statement_timeout: 10 * 1000,
    });
  }

  public open(spec: {
    chunkSize: number;
    onError: (err: Error) => void;
    onReady: (db: PGDatabase) => void;
  }) {
    spec.onReady(
      new PGDatabase(this.pool, spec.chunkSize, this.resumeDatabase),
    );
  }
}

function printPGQuery(q: any, s = '') {
  const values = q.values
    ? ' | ' + q.values.map((v, i) => `$${i + 1}=${v}`).join(', ')
    : '';
  console.log(`${s}: ${q.text}${values}`);
}

function printPGClient(client: any, pad = '') {
  printPGQuery(client.activeQuery, `${pad}activeQuery`);
  const q = client.queryQueue;
  for (let i = 0; i < q.length; i++) {
    printPGQuery(q[i], `${pad}queryQueue[${i}]`);
  }
}

function printPGPool(pool: any) {
  for (let i = 0; i < pool._clients.length; i++) {
    const c = pool._clients[i];
    if (c.activeQuery) {
      console.log(`client ${i}:`);
      printPGClient(pool._clients[i], '  ');
    } else {
      console.log(`client ${i}: no active query`);
    }
  }
}

export class PGDatabase implements CommonDatabase {
  private lastResumeTime = 0;

  constructor(
    private pool: Pool,
    private chunkSize: number,
    private resumeDatabase: () => any,
  ) {}

  public prepareSQL(sqlExpr: string[]) {
    if (sqlExpr.length === 0) {
      return '';
    }
    let sql = sqlExpr[0];
    for (let i = 1; i < sqlExpr.length; i++) {
      sql += ` $${i} ${sqlExpr[i]}`;
    }
    return sql;
  }

  public async query(spec: {
    sqlExpr: string;
    params: any[];
    onReady: (step: () => void, close: () => void) => void;
    onRows: (
      columns: string[],
      row: (Uint8Array | number | string | boolean | null)[][],
    ) => void;
    onDone: () => void;
    onError: (err: Error) => void;
  }) {
    let client: PoolClient | undefined;
    for (let i = 0; i < 8; i++) {
      try {
        client = await this.pool.connect();
        break;
      } catch (err) {
        console.error('cannot connect to database:', err);
        const pool: any = this.pool;
        if (pool.options.max - pool._clients.length + pool.idleCount === 0) {
          console.log('pool has been exhausted, clients:');
          printPGPool(pool);
        }
        const now = Date.now();
        if (now - this.lastResumeTime > 10 * 1000) {
          this.resumeDatabase();
          this.lastResumeTime = now;
        }
        await sleep(1000 * (1 << i));
      }
    }
    if (!client) {
      spec.onError(new Error('cannot connect to database server'));
      return;
    }

    const cursor = client.query(new Cursor(spec.sqlExpr, spec.params));
    let done = false;
    const close = (err?: Error) => {
      if (done) {
        return false;
      }
      done = true;
      cursor.close();
      client!.release(err);
      if (err) {
        spec.onError(err);
      } else {
        spec.onDone();
      }
      return true;
    };

    const step = () => {
      if (done) {
        return;
      }
      cursor.read(this.chunkSize, (error, rows, result) => {
        if (error) {
          close(error);
          return;
        }
        if (rows.length > 0) {
          const cols = result.fields.map(({ name }) => name);
          spec.onRows(
            cols,
            rows.map((row) => cols.map((name) => row[name])),
          );
        }
        if (rows.length < this.chunkSize) {
          close();
        }
      });
    };
    spec.onReady(step, () => close(new Error('query was cancelled')));
  }

  public close(spec: { onSuccess: () => void; onError: (err: Error) => void }) {
    spec.onSuccess();
  }
}
