import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from 'pg';

import type { ListPageOptions } from '@box-local/schema/api/js/storage';
import type { Logger } from '@box-local/utils/logger';
import type {
  CommonGameDataServer,
  ReturnValue,
  TableType,
} from './types';

type TicketConnection = {
  client: PoolClient;
  identity: string;
  timeout: ReturnType<typeof setTimeout>;
};

export type PostgresDataStorageOptions = {
  connectionString: string;
  schema: string;
  poolSize: number;
  ssl: boolean;
  sslRejectUnauthorized: boolean;
  projectNamespace: string;
  groupNamespace: string;
  mode: string;
  lockTimeoutMs: number;
  logger: Logger;
  /** Internal test seam. Production callers always let the adapter create it. */
  pool?: Pool;
};

const schemaPattern = /^[a-z_][a-z0-9_]{0,62}$/;

function requireNamespace(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 160) {
    throw new Error(`${label} must contain between 1 and 160 characters`);
  }
  return normalized;
}

function rowToValue(row: QueryResultRow | undefined): ReturnValue | undefined {
  if (!row) return undefined;
  return {
    key: String(row.key),
    value: row.value,
    version: String(row.version),
    createTime: new Date(row.created_at).valueOf(),
    updateTime: new Date(row.updated_at).valueOf(),
  };
}

export class PostgresDataStorage implements CommonGameDataServer {
  private readonly pool: Pool;
  private readonly ready: Promise<void>;
  private readonly tableName: string;
  private readonly tickets = new Map<string, TicketConnection>();

  constructor(private readonly options: PostgresDataStorageOptions) {
    if (!options.connectionString.trim()) {
      throw new Error('BOX_DATABASE_URL is required for PostgreSQL data storage');
    }
    if (!schemaPattern.test(options.schema)) {
      throw new Error('BOX_DATABASE_SCHEMA must be a lowercase PostgreSQL identifier');
    }
    requireNamespace(options.projectNamespace, 'project data storage namespace');
    requireNamespace(options.groupNamespace, 'group data storage namespace');
    this.tableName = `"${options.schema}"."data_entries"`;
    const poolConfig: PoolConfig = {
      connectionString: options.connectionString,
      max: Math.max(1, Math.min(100, options.poolSize || 10)),
      application_name: 'box-local-engine',
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: Math.max(1000, options.lockTimeoutMs),
      ssl: options.ssl
        ? { rejectUnauthorized: options.sslRejectUnauthorized }
        : false,
    };
    this.pool = options.pool || new Pool(poolConfig);
    this.pool.on('error', (error) => {
      this.options.logger.error(error);
    });
    this.ready = this.initialize();
  }

  private namespace(tableType: TableType) {
    const base = tableType === 'group'
      ? this.options.groupNamespace
      : this.options.projectNamespace;
    return `${tableType}:${base}:${this.options.mode}`;
  }

  private identity(tableType: TableType, table: string, key: string) {
    return `${this.namespace(tableType)}\u0000${table}\u0000${key}`;
  }

  private async initialize() {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS "${this.options.schema}"`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        namespace TEXT NOT NULL,
        storage_name TEXT NOT NULL,
        key TEXT NOT NULL,
        value JSONB NOT NULL,
        version BIGINT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (namespace, storage_name, key)
      )
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS "data_entries_storage_idx"
      ON ${this.tableName} (namespace, storage_name, updated_at DESC)
    `);
    this.options.logger.log(
      `PostgreSQL data storage ready: ${JSON.stringify({
        driver: 'postgres',
        schema: this.options.schema,
        projectNamespace: this.options.projectNamespace,
        mode: this.options.mode,
      })}`,
    );
  }

  public async connect() {
    await this.ready;
  }

  public async close() {
    for (const [ticket, connection] of this.tickets) {
      clearTimeout(connection.timeout);
      this.tickets.delete(ticket);
      try {
        await connection.client.query('ROLLBACK');
      } finally {
        connection.client.release();
      }
    }
    await this.pool.end();
  }

  private async beginTicket(
    ticket: string,
    tableType: TableType,
    table: string,
    key: string,
  ) {
    if (!ticket || this.tickets.has(ticket)) {
      throw new Error('invalid or duplicate PostgreSQL storage ticket');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const namespace = this.namespace(tableType);
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [`${namespace}\u0000${table}`, key],
      );
      const timeout = setTimeout(() => {
        const current = this.tickets.get(ticket);
        if (!current) return;
        this.tickets.delete(ticket);
        current.client.query('ROLLBACK')
          .catch(() => undefined)
          .finally(() => current.client.release());
      }, Math.max(1000, this.options.lockTimeoutMs));
      timeout.unref();
      this.tickets.set(ticket, {
        client,
        identity: this.identity(tableType, table, key),
        timeout,
      });
      return client;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
      throw error;
    }
  }

  private takeTicket(
    ticket: string,
    tableType: TableType,
    table: string,
    key: string,
  ) {
    const connection = this.tickets.get(ticket);
    if (!connection || connection.identity !== this.identity(tableType, table, key)) {
      throw new Error('PostgreSQL storage ticket does not match this key');
    }
    this.tickets.delete(ticket);
    clearTimeout(connection.timeout);
    return connection.client;
  }

  private async finish(client: PoolClient, commit: boolean) {
    try {
      await client.query(commit ? 'COMMIT' : 'ROLLBACK');
    } finally {
      client.release();
    }
  }

  public async createTable(_tableType: TableType, table: string) {
    if (!table.trim()) throw new Error('data storage name is required');
    await this.ready;
  }

  public async get(
    tableType: TableType,
    table: string,
    key: string,
    _version?: string,
    ticket?: string,
  ) {
    await this.ready;
    const client = ticket
      ? await this.beginTicket(ticket, tableType, table, key)
      : this.pool;
    try {
      const result = await client.query(
        `SELECT key, value, version, created_at, updated_at
         FROM ${this.tableName}
         WHERE namespace = $1 AND storage_name = $2 AND key = $3`,
        [this.namespace(tableType), table, key],
      );
      return rowToValue(result.rows[0]);
    } catch (error) {
      if (ticket) {
        const connection = this.tickets.get(ticket);
        if (connection) {
          this.tickets.delete(ticket);
          clearTimeout(connection.timeout);
          await this.finish(connection.client, false);
        }
      }
      throw error;
    }
  }

  public async set(
    tableType: TableType,
    table: string,
    key: string,
    value: unknown,
    ticket?: string,
  ) {
    await this.ready;
    const client = ticket
      ? this.takeTicket(ticket, tableType, table, key)
      : this.pool;
    let success = false;
    try {
      await client.query(
        `INSERT INTO ${this.tableName}
          (namespace, storage_name, key, value)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (namespace, storage_name, key)
         DO UPDATE SET
           value = EXCLUDED.value,
           version = "data_entries".version + 1,
           updated_at = NOW()`,
        [this.namespace(tableType), table, key, JSON.stringify(value)],
      );
      success = true;
    } finally {
      if (ticket) await this.finish(client as PoolClient, success);
    }
  }

  public async increment(
    tableType: TableType,
    table: string,
    key: string,
    value: number,
  ) {
    await this.ready;
    const result = await this.pool.query(
      `INSERT INTO ${this.tableName}
        (namespace, storage_name, key, value)
       VALUES ($1, $2, $3, to_jsonb($4::double precision))
       ON CONFLICT (namespace, storage_name, key)
       DO UPDATE SET
         value = to_jsonb(
           CASE WHEN jsonb_typeof("data_entries".value) = 'number'
             THEN ("data_entries".value)::text::double precision
             ELSE NULL
           END + $4::double precision
         ),
         version = "data_entries".version + 1,
         updated_at = NOW()
       RETURNING value`,
      [this.namespace(tableType), table, key, value],
    );
    return Number(result.rows[0]?.value ?? 0);
  }

  public async list(
    tableType: TableType,
    table: string,
    options: ListPageOptions,
  ) {
    await this.ready;
    const pageSize = Math.max(1, Math.min(1000, options.pageSize || 100));
    const cursor = Math.max(0, options.cursor || 0);
    const params: unknown[] = [this.namespace(tableType), table];
    const clauses = ['namespace = $1', 'storage_name = $2'];
    const path = options.constraintTarget
      ? options.constraintTarget.split('.').filter(Boolean)
      : [];
    let target = 'value';
    if (path.length) {
      const pathParams = path.map((segment) => {
        params.push(segment);
        return `$${params.length}::text`;
      });
      target = `jsonb_extract_path(value, ${pathParams.join(', ')})`;
    }
    const numericTarget = `CASE WHEN jsonb_typeof(${target}) = 'number' THEN (${target})::text::double precision END`;
    if (typeof options.min === 'number') {
      params.push(options.min);
      clauses.push(`${numericTarget} >= $${params.length}::double precision`);
    }
    if (typeof options.max === 'number') {
      params.push(options.max);
      clauses.push(`${numericTarget} <= $${params.length}::double precision`);
    }
    params.push(pageSize + 1, cursor * pageSize);
    const limitIndex = params.length - 1;
    const offsetIndex = params.length;
    const direction = options.ascending === false ? 'DESC' : 'ASC';
    const result = await this.pool.query(
      `SELECT key, value, version, created_at, updated_at
       FROM ${this.tableName}
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${numericTarget} ${direction} NULLS LAST, key ${direction}
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params,
    );
    const hasMore = result.rows.length > pageSize;
    return {
      items: result.rows.slice(0, pageSize).map((row) => rowToValue(row)!),
      isLastPage: !hasMore,
    };
  }

  public async remove(
    tableType: TableType,
    table: string,
    key: string,
    ticket?: string,
  ) {
    await this.ready;
    if (!ticket) {
      const result = await this.pool.query(
        `DELETE FROM ${this.tableName}
         WHERE namespace = $1 AND storage_name = $2 AND key = $3
         RETURNING key, value, version, created_at, updated_at`,
        [this.namespace(tableType), table, key],
      );
      return rowToValue(result.rows[0]);
    }
    const client = await this.pool.connect();
    let success = false;
    try {
      await client.query('BEGIN');
      const namespace = this.namespace(tableType);
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [`${namespace}\u0000${table}`, key],
      );
      const result = await client.query(
        `DELETE FROM ${this.tableName}
         WHERE namespace = $1 AND storage_name = $2 AND key = $3
         RETURNING key, value, version, created_at, updated_at`,
        [namespace, table, key],
      );
      success = true;
      return rowToValue(result.rows[0]);
    } finally {
      await this.finish(client, success);
    }
  }

  public async dropTable(tableType: TableType, table: string) {
    await this.ready;
    await this.pool.query(
      `DELETE FROM ${this.tableName}
       WHERE namespace = $1 AND storage_name = $2`,
      [this.namespace(tableType), table],
    );
  }
}
