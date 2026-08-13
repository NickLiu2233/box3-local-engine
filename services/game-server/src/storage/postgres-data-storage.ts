import { createHash, randomUUID } from 'node:crypto';
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

type StorageTables = {
  baseName: string;
  data: string;
  keys: string;
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
const storageNamePattern = /^[a-zA-Z0-9_]+$/;
const modePattern = /^[a-zA-Z0-9_]+$/;

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function requireNamespace(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 160) {
    throw new Error(`${label} must contain between 1 and 160 characters`);
  }
  return normalized;
}

function createObjectId() {
  return randomUUID().replace(/-/g, '').slice(0, 16);
}

function createVersion() {
  return randomUUID().replace(/-/g, '').slice(0, 26).toUpperCase();
}

function parseStoredValue(value: unknown) {
  let parsed = value;
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    Object.prototype.hasOwnProperty.call(parsed, 'content')
  ) {
    return (parsed as { content: unknown }).content;
  }
  return parsed;
}

function rowToValue(row: QueryResultRow | undefined): ReturnValue | undefined {
  if (!row) return undefined;
  return {
    key: String(row.key),
    value: parseStoredValue(row.value) as ReturnValue['value'],
    version: String(row.version),
    createTime: new Date(row.created_at).valueOf(),
    updateTime: new Date(row.updated_at).valueOf(),
  };
}

export class PostgresDataStorage implements CommonGameDataServer {
  private readonly pool: Pool;
  private ready?: Promise<void>;
  private readonly tickets = new Map<string, TicketConnection>();
  private readonly tableReady = new Map<string, Promise<StorageTables>>();

  constructor(private readonly options: PostgresDataStorageOptions) {
    if (!options.connectionString.trim()) {
      throw new Error('BOX_DATABASE_URL is required for PostgreSQL data storage');
    }
    if (!schemaPattern.test(options.schema)) {
      throw new Error('BOX_DATABASE_SCHEMA must be a lowercase PostgreSQL identifier');
    }
    requireNamespace(options.projectNamespace, 'project data storage namespace');
    requireNamespace(options.groupNamespace, 'group data storage namespace');
    if (!modePattern.test(options.mode)) {
      throw new Error('data storage mode must contain only letters, numbers, and underscores');
    }
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
  }

  private ensureReady() {
    if (!this.ready) {
      const pending = this.initialize().catch((error) => {
        if (this.ready === pending) this.ready = undefined;
        throw error;
      });
      this.ready = pending;
    }
    return this.ready;
  }

  private namespace(tableType: TableType) {
    return tableType === 'group'
      ? this.options.groupNamespace
      : this.options.projectNamespace;
  }

  /**
   * Preserve the original boxes naming convention:
   *   group_play_100010141_player (+ _keys)
   *   play_100010141_player       (+ _keys)
   */
  private tableBaseName(tableType: TableType, storageName: string) {
    if (!storageNamePattern.test(storageName) || storageName.length > 50) {
      throw new Error(
        'data storage name must contain only letters, numbers, and underscores and be at most 50 characters',
      );
    }
    const groupPrefix = tableType === 'group' ? 'group_' : '';
    const baseName = `${groupPrefix}${this.options.mode}_${this.namespace(tableType)}_${storageName}`;
    if (Buffer.byteLength(`${baseName}_keys`, 'utf8') > 63) {
      throw new Error(
        `legacy-compatible PostgreSQL table name is too long: ${baseName}_keys`,
      );
    }
    return baseName;
  }

  private tableBaseCandidates(tableType: TableType, storageName: string) {
    const canonical = this.tableBaseName(tableType, storageName);
    if (tableType === 'group') return [canonical];
    // Some older boxes deployments used an explicit map_ prefix. Prefer the
    // canonical unprefixed name for new tables, but accept either on restore.
    return [
      canonical,
      `map_${this.options.mode}_${this.namespace(tableType)}_${storageName}`,
    ];
  }

  private tablesForBase(baseName: string): StorageTables {
    const schema = quoteIdentifier(this.options.schema);
    return {
      baseName,
      data: `${schema}.${quoteIdentifier(baseName)}`,
      keys: `${schema}.${quoteIdentifier(`${baseName}_keys`)}`,
    };
  }

  private tables(tableType: TableType, storageName: string): StorageTables {
    return this.tablesForBase(this.tableBaseName(tableType, storageName));
  }

  private identity(tableType: TableType, table: string, key: string) {
    return `${this.tableBaseName(tableType, table)}\u0000${key}`;
  }

  private async initialize() {
    await this.pool.query(
      `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.options.schema)}`,
    );
    this.options.logger.log(
      `PostgreSQL legacy-compatible data storage ready: ${JSON.stringify({
        driver: 'postgres',
        schema: this.options.schema,
        projectNamespace: this.options.projectNamespace,
        groupNamespace: this.options.groupNamespace,
        mode: this.options.mode,
        layout: 'boxes-dual-table',
      })}`,
    );
  }

  private async ensureTables(tableType: TableType, storageName: string) {
    await this.ensureReady();
    const cacheKey = `${tableType}\u0000${storageName}`;
    const existing = this.tableReady.get(cacheKey);
    if (existing) return existing;
    const creation = this.resolveOrCreateTables(tableType, storageName).catch((error) => {
      this.tableReady.delete(cacheKey);
      throw error;
    });
    this.tableReady.set(cacheKey, creation);
    return creation;
  }

  private async resolveOrCreateTables(
    tableType: TableType,
    storageName: string,
  ) {
    for (const baseName of this.tableBaseCandidates(tableType, storageName)) {
      const candidate = this.tablesForBase(baseName);
      try {
        await this.pool.query(`SELECT 1 FROM ${candidate.data} LIMIT 0`);
        await this.pool.query(`SELECT 1 FROM ${candidate.keys} LIMIT 0`);
        return candidate;
      } catch (error) {
        // Missing candidates are normal. The first canonical pair is created
        // below when no complete restored pair exists.
        const code = (error as { code?: string }).code;
        const message = error instanceof Error ? error.message : String(error);
        if (code !== '42P01' && !/does not exist/i.test(message)) throw error;
      }
    }
    return this.createTables(this.tables(tableType, storageName));
  }

  private async createTables(tables: StorageTables) {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${tables.data} (
        "objectId" TEXT PRIMARY KEY,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "_rperm" TEXT,
        "_wperm" TEXT,
        "metadata" TEXT NOT NULL DEFAULT '{}',
        "value" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "version" TEXT NOT NULL
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${tables.keys} (
        "objectId" TEXT PRIMARY KEY,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "_rperm" TEXT,
        "_wperm" TEXT,
        "key" TEXT NOT NULL,
        "isDelete" BOOLEAN NOT NULL DEFAULT FALSE,
        "record" TEXT
      )
    `);
    const indexStem = createHash('sha256')
      .update(`${this.options.schema}.${tables.baseName}`)
      .digest('hex')
      .slice(0, 16);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`storage_data_${indexStem}`)}
      ON ${tables.data} ("key", "updatedAt" DESC)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`storage_keys_${indexStem}`)}
      ON ${tables.keys} ("key", "isDelete", "updatedAt" DESC)
    `);
    return tables;
  }

  public async connect() {
    await this.ensureReady();
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
    const tables = await this.ensureTables(tableType, table);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [tables.baseName, key],
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

  private async selectCurrent(
    client: Pool | PoolClient,
    tables: StorageTables,
    key: string,
  ) {
    const result = await client.query(
      `SELECT
         d."key" AS key,
         d."value" AS value,
         d."version" AS version,
         d."createdAt" AS created_at,
         d."updatedAt" AS updated_at
       FROM ${tables.keys} k
       JOIN ${tables.data} d
         ON d."objectId"::text = k."record"::text
       WHERE k."key"::text = $1
         AND COALESCE(k."isDelete", FALSE) = FALSE
       ORDER BY k."updatedAt" DESC
       LIMIT 1`,
      [key],
    );
    return result.rows[0];
  }

  private async writeValue(
    client: PoolClient,
    tables: StorageTables,
    key: string,
    value: unknown,
  ) {
    const keyResult = await client.query(
      `SELECT "objectId" AS object_id
       FROM ${tables.keys}
       WHERE "key"::text = $1
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      [key],
    );
    const recordId = createObjectId();
    const version = createVersion();
    await client.query(
      `INSERT INTO ${tables.data}
        ("objectId", "createdAt", "updatedAt", "metadata", "value", "key", "version")
       VALUES ($1, NOW(), NOW(), '{}', $2, $3, $4)`,
      [recordId, JSON.stringify({ content: value }), key, version],
    );
    if (keyResult.rows[0]) {
      await client.query(
        `UPDATE ${tables.keys}
         SET "updatedAt" = NOW(), "isDelete" = FALSE, "record" = $1
         WHERE "objectId"::text = $2`,
        [recordId, String(keyResult.rows[0].object_id)],
      );
    } else {
      await client.query(
        `INSERT INTO ${tables.keys}
          ("objectId", "createdAt", "updatedAt", "key", "isDelete", "record")
         VALUES ($1, NOW(), NOW(), $2, FALSE, $3)`,
        [createObjectId(), key, recordId],
      );
    }
  }

  public async createTable(tableType: TableType, table: string) {
    await this.ensureTables(tableType, table);
  }

  public async get(
    tableType: TableType,
    table: string,
    key: string,
    version?: string,
    ticket?: string,
  ) {
    const tables = await this.ensureTables(tableType, table);
    const client = ticket
      ? await this.beginTicket(ticket, tableType, table, key)
      : this.pool;
    try {
      if (version) {
        const result = await client.query(
          `SELECT
             "key" AS key,
             "value" AS value,
             "version" AS version,
             "createdAt" AS created_at,
             "updatedAt" AS updated_at
           FROM ${tables.data}
           WHERE "key"::text = $1 AND "version"::text = $2
           ORDER BY "updatedAt" DESC
           LIMIT 1`,
          [key, version],
        );
        return rowToValue(result.rows[0]);
      }
      return rowToValue(await this.selectCurrent(client, tables, key));
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
    const tables = await this.ensureTables(tableType, table);
    const client = ticket
      ? this.takeTicket(ticket, tableType, table, key)
      : await this.pool.connect();
    let success = false;
    try {
      if (!ticket) {
        await client.query('BEGIN');
        await client.query(
          'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
          [tables.baseName, key],
        );
      }
      await this.writeValue(client, tables, key, value);
      success = true;
    } finally {
      await this.finish(client, success);
    }
  }

  public async increment(
    tableType: TableType,
    table: string,
    key: string,
    value: number,
  ) {
    const tables = await this.ensureTables(tableType, table);
    const client = await this.pool.connect();
    let success = false;
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [tables.baseName, key],
      );
      const current = rowToValue(await this.selectCurrent(client, tables, key));
      const previous = current?.value === undefined ? 0 : current.value;
      if (typeof previous !== 'number') {
        throw new Error('The increment value should be a numeric type.');
      }
      const next = previous + value;
      await this.writeValue(client, tables, key, next);
      success = true;
      return next;
    } finally {
      await this.finish(client, success);
    }
  }

  public async list(
    tableType: TableType,
    table: string,
    options: ListPageOptions,
  ) {
    const tables = await this.ensureTables(tableType, table);
    const pageSize = Math.max(1, Math.min(1000, options.pageSize || 100));
    const cursor = Math.max(0, options.cursor || 0);
    const params: unknown[] = [];
    const content = `(d."value"::jsonb -> 'content')`;
    const path = options.constraintTarget
      ? options.constraintTarget.split('.').filter(Boolean)
      : [];
    let target = content;
    if (path.length) {
      const pathParams = path.map((segment) => {
        params.push(segment);
        return `$${params.length}::text`;
      });
      target = `jsonb_extract_path(${content}, ${pathParams.join(', ')})`;
    }
    const numericTarget = `CASE WHEN jsonb_typeof(${target}) = 'number' THEN (${target})::text::double precision END`;
    const clauses = ['COALESCE(k."isDelete", FALSE) = FALSE'];
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
      `SELECT
         d."key" AS key,
         d."value" AS value,
         d."version" AS version,
         d."createdAt" AS created_at,
         d."updatedAt" AS updated_at
       FROM ${tables.keys} k
       JOIN ${tables.data} d
         ON d."objectId"::text = k."record"::text
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${numericTarget} ${direction} NULLS LAST, k."key" ${direction}
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
    const tables = await this.ensureTables(tableType, table);
    const hasTicket = Boolean(ticket && this.tickets.has(ticket));
    const client = hasTicket
      ? this.takeTicket(ticket!, tableType, table, key)
      : await this.pool.connect();
    let success = false;
    try {
      if (!hasTicket) {
        await client.query('BEGIN');
        await client.query(
          'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
          [tables.baseName, key],
        );
      }
      const previous = rowToValue(await this.selectCurrent(client, tables, key));
      await client.query(
        `UPDATE ${tables.keys}
         SET "updatedAt" = NOW(), "isDelete" = TRUE
         WHERE "key"::text = $1 AND COALESCE("isDelete", FALSE) = FALSE`,
        [key],
      );
      success = true;
      return previous;
    } finally {
      await this.finish(client, success);
    }
  }

  public async dropTable(tableType: TableType, table: string) {
    await this.ensureReady();
    const tables = this.tables(tableType, table);
    await this.pool.query(`DROP TABLE IF EXISTS ${tables.keys}`);
    await this.pool.query(`DROP TABLE IF EXISTS ${tables.data}`);
    this.tableReady.delete(`${tableType}\u0000${table}`);
  }
}
