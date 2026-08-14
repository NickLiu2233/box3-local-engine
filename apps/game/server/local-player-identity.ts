import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { parse, serialize } from 'cookie';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

import {
  createPlayerUserKey,
  signRuntimePlayerIdentity,
  type LocalPlayerRole,
  type LocalPlayerStatus,
  type RuntimePlayerIdentity,
} from '@box-local/utils/local-player-identity';
import { requestClientAddress } from './client-address';

const COOKIE_NAME = 'box_local_player_session';
const SESSION_DAYS = 30;
const schemaPattern = /^[a-z_][a-z0-9_]{0,62}$/;
const usernamePattern = /^[a-zA-Z][a-zA-Z0-9_]{2,31}$/;
const displayNamePattern = /^.{1,32}$/;

type IdentityRow = QueryResultRow & {
  subject_id: string;
  user_id: string | number | null;
  username: string | null;
  display_name: string | null;
  avatar_hash: string | null;
  role: LocalPlayerRole | null;
  status: LocalPlayerStatus | null;
  created_at?: string | Date;
  last_seen_at?: string | Date;
  registered_at?: string | Date;
  updated_at?: string | Date;
  first_seen_ip?: string | null;
  last_seen_ip?: string | null;
  registration_ip?: string | null;
  last_login_at?: string | Date | null;
  last_login_ip?: string | null;
  login_count?: string | number | null;
  active_session_count?: string | number | null;
  admin_note?: string | null;
  tags?: string[] | null;
  ban_reason?: string | null;
  banned_at?: string | Date | null;
  banned_until?: string | Date | null;
};

export type PlayerAccountView = {
  subjectId: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  role: LocalPlayerRole;
  status: LocalPlayerStatus;
  guest: boolean;
  userKey: string;
  createdAt?: string;
  lastSeenAt?: string;
  registeredAt?: string;
  updatedAt?: string;
  firstSeenIp: string;
  lastSeenIp: string;
  registrationIp: string;
  lastLoginAt?: string;
  lastLoginIp: string;
  loginCount: number;
  activeSessionCount: number;
  adminNote: string;
  tags: string[];
  banReason: string;
  bannedAt?: string;
  bannedUntil?: string;
};

export type ManagedPlayerListOptions = {
  search?: string;
  page?: number;
  pageSize?: number;
  identity?: 'all' | 'user' | 'banned';
  role?: 'all' | LocalPlayerRole;
  online?: 'all' | 'online' | 'offline';
  sort?: 'lastSeen' | 'registered' | 'displayName' | 'loginCount';
};

export type ManagedPlayerList = {
  players: PlayerAccountView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminActionContext = {
  ip: string;
  userAgent: string;
  subjectId?: string;
  actor?: string;
  actorDisplayName?: string;
  actorRole?: LocalPlayerRole | 'owner';
};

export type PlayerAdminActivity = {
  events: Array<{
    id: string;
    kind: 'login' | 'admin';
    action: string;
    actor: string;
    actorDisplayName: string;
    subjectId: string;
    displayName: string;
    username: string;
    ip: string;
    userAgent: string;
    details: Record<string, unknown>;
    createdAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ManagedPlayerDetails = {
  player: PlayerAccountView;
  sessions: Array<{
    sessionId: string;
    createdAt: string;
    lastSeenAt: string;
    expiresAt: string;
    createdIp: string;
    lastSeenIp: string;
    userAgent: string;
  }>;
  loginHistory: Array<{
    createdAt: string;
    ip: string;
    userAgent: string;
  }>;
};

export type PlayerAdminOverview = {
  totals: {
    identities: number;
    users: number;
    guests: number;
    banned: number;
    activeSessions: number;
    activeLast24Hours: number;
    newLast7Days: number;
    loginsLast24Hours: number;
    failedLoginsLast24Hours: number;
    uniqueLoginIpsLast7Days: number;
    moderators: number;
    admins: number;
  };
  recentLogins: Array<{
    subjectId: string;
    displayName: string;
    username: string;
    ip: string;
    userAgent: string;
    createdAt: string;
  }>;
  recentAudits: Array<{
    id: string;
    action: string;
    subjectId: string;
    details: Record<string, unknown>;
    createdAt: string;
  }>;
};

let pool: Pool | null = null;
let initialized: Promise<void> | null = null;

function identitySecret() {
  const value = process.env.PERMISSION_TOKEN_SECRET || '';
  if (!value) {
    throw new Error('PERMISSION_TOKEN_SECRET is required for player identity');
  }
  return value;
}

function identitySchema() {
  const value = process.env.BOX_IDENTITY_DATABASE_SCHEMA || 'box_identity';
  if (!schemaPattern.test(value)) {
    throw new Error('BOX_IDENTITY_DATABASE_SCHEMA must be a lowercase PostgreSQL identifier');
  }
  return value;
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function table(name: string) {
  return `${quoteIdentifier(identitySchema())}.${quoteIdentifier(name)}`;
}

function getPool() {
  const connectionString = (process.env.BOX_DATABASE_URL || '').trim();
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: Math.max(1, Math.min(20, Number(process.env.BOX_DATABASE_POOL_SIZE) || 10)),
      application_name: 'box-local-player-identity',
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      ssl: process.env.BOX_DATABASE_SSL === 'true'
        ? { rejectUnauthorized: process.env.BOX_DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : false,
    });
    pool.on('error', (error) => console.error('Player identity PostgreSQL error:', error.message));
  }
  return pool;
}

async function initialize() {
  const database = getPool();
  if (!database) return;
  if (!initialized) {
    initialized = (async () => {
      const schema = quoteIdentifier(identitySchema());
      await database.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
      await database.query(`
        CREATE TABLE IF NOT EXISTS ${table('principals')} (
          id UUID PRIMARY KEY,
          kind TEXT NOT NULL CHECK (kind IN ('guest', 'user')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          first_seen_ip TEXT NOT NULL DEFAULT '',
          last_seen_ip TEXT NOT NULL DEFAULT ''
        )
      `);
      await database.query(`ALTER TABLE ${table('principals')} ADD COLUMN IF NOT EXISTS first_seen_ip TEXT NOT NULL DEFAULT ''`);
      await database.query(`ALTER TABLE ${table('principals')} ADD COLUMN IF NOT EXISTS last_seen_ip TEXT NOT NULL DEFAULT ''`);
      await database.query(`
        CREATE TABLE IF NOT EXISTS ${table('users')} (
          id BIGSERIAL PRIMARY KEY,
          principal_id UUID NOT NULL UNIQUE REFERENCES ${table('principals')}(id) ON DELETE CASCADE,
          username TEXT NOT NULL,
          display_name TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          avatar_hash TEXT NOT NULL DEFAULT '',
          role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'moderator', 'admin')),
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned')),
          registration_ip TEXT NOT NULL DEFAULT '',
          last_login_at TIMESTAMPTZ,
          last_login_ip TEXT NOT NULL DEFAULT '',
          login_count BIGINT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await database.query(`ALTER TABLE ${table('users')} ADD COLUMN IF NOT EXISTS registration_ip TEXT NOT NULL DEFAULT ''`);
      await database.query(`ALTER TABLE ${table('users')} ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`);
      await database.query(`ALTER TABLE ${table('users')} ADD COLUMN IF NOT EXISTS last_login_ip TEXT NOT NULL DEFAULT ''`);
      await database.query(`ALTER TABLE ${table('users')} ADD COLUMN IF NOT EXISTS login_count BIGINT NOT NULL DEFAULT 0`);
      await database.query(`ALTER TABLE ${table('users')} ADD COLUMN IF NOT EXISTS admin_note TEXT NOT NULL DEFAULT ''`);
      await database.query(`ALTER TABLE ${table('users')} ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'::text[]`);
      await database.query(`ALTER TABLE ${table('users')} ADD COLUMN IF NOT EXISTS ban_reason TEXT NOT NULL DEFAULT ''`);
      await database.query(`ALTER TABLE ${table('users')} ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ`);
      await database.query(`ALTER TABLE ${table('users')} ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ`);
      await database.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS local_users_username_lower
        ON ${table('users')} (LOWER(username))
      `);
      await database.query(`
        CREATE TABLE IF NOT EXISTS ${table('sessions')} (
          token_hash TEXT PRIMARY KEY,
          principal_id UUID NOT NULL REFERENCES ${table('principals')}(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_ip TEXT NOT NULL DEFAULT '',
          last_seen_ip TEXT NOT NULL DEFAULT '',
          user_agent TEXT NOT NULL DEFAULT ''
        )
      `);
      await database.query(`ALTER TABLE ${table('sessions')} ADD COLUMN IF NOT EXISTS created_ip TEXT NOT NULL DEFAULT ''`);
      await database.query(`ALTER TABLE ${table('sessions')} ADD COLUMN IF NOT EXISTS last_seen_ip TEXT NOT NULL DEFAULT ''`);
      await database.query(`ALTER TABLE ${table('sessions')} ADD COLUMN IF NOT EXISTS user_agent TEXT NOT NULL DEFAULT ''`);
      await database.query(`
        CREATE INDEX IF NOT EXISTS local_sessions_principal
        ON ${table('sessions')} (principal_id)
      `);
      await database.query(`
        CREATE TABLE IF NOT EXISTS ${table('audit_logs')} (
          id BIGSERIAL PRIMARY KEY,
          actor TEXT NOT NULL,
          action TEXT NOT NULL,
          subject_id UUID,
          details JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await database.query(`
        CREATE TABLE IF NOT EXISTS ${table('login_events')} (
          id BIGSERIAL PRIMARY KEY,
          principal_id UUID NOT NULL REFERENCES ${table('principals')}(id) ON DELETE CASCADE,
          ip_address TEXT NOT NULL DEFAULT '',
          user_agent TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await database.query(`
        CREATE INDEX IF NOT EXISTS local_login_events_principal_created
        ON ${table('login_events')} (principal_id, created_at DESC)
      `);
      await database.query(`
        CREATE INDEX IF NOT EXISTS local_login_events_created
        ON ${table('login_events')} (created_at DESC)
      `);
      await database.query(`
        CREATE TABLE IF NOT EXISTS ${table('auth_failures')} (
          id BIGSERIAL PRIMARY KEY,
          username TEXT NOT NULL DEFAULT '',
          reason TEXT NOT NULL,
          ip_address TEXT NOT NULL DEFAULT '',
          user_agent TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await database.query(`
        CREATE INDEX IF NOT EXISTS local_auth_failures_created
        ON ${table('auth_failures')} (created_at DESC)
      `);
      await database.query(`
        CREATE TABLE IF NOT EXISTS ${table('player_revocations')} (
          id BIGSERIAL PRIMARY KEY,
          subject_id UUID NOT NULL,
          reason TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await database.query(`
        CREATE INDEX IF NOT EXISTS local_player_revocations_created
        ON ${table('player_revocations')} (created_at DESC)
      `);
      await database.query(`
        CREATE INDEX IF NOT EXISTS local_audit_logs_created
        ON ${table('audit_logs')} (created_at DESC)
      `);
    })().catch((error) => {
      initialized = null;
      throw error;
    });
  }
  await initialized;
}

function sessionToken(req: NextApiRequest) {
  return parse(req.headers.cookie || '')[COOKIE_NAME] || '';
}

function secretsMatch(provided: string, expected: string) {
  const providedDigest = createHash('sha256').update(provided).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

export function isInternalIdentityRequest(req: NextApiRequest) {
  const authorization = String(req.headers.authorization || '');
  const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  return Boolean(provided) && secretsMatch(provided, identitySecret());
}

function requestIp(req: NextApiRequest) {
  if (isInternalIdentityRequest(req)) {
    const internal = req.headers['x-box-player-ip'];
    const value = Array.isArray(internal) ? internal[0] : internal;
    if (value) return value.slice(0, 128);
  }
  return requestClientAddress(req).slice(0, 128);
}

function requestUserAgent(req: NextApiRequest) {
  if (isInternalIdentityRequest(req)) {
    const internal = req.headers['x-box-player-user-agent'];
    const value = Array.isArray(internal) ? internal[0] : internal;
    if (value) return value.slice(0, 512);
  }
  return String(req.headers['user-agent'] || '').slice(0, 512);
}

export function createAdminActionContext(req: NextApiRequest): AdminActionContext {
  return { ip: requestIp(req), userAgent: requestUserAgent(req) };
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function appendCookie(res: NextApiResponse, value: string) {
  const current = res.getHeader('Set-Cookie');
  const values = !current ? [] : Array.isArray(current) ? current.map(String) : [String(current)];
  res.setHeader('Set-Cookie', [...values, value]);
}

function secureCookie(req: NextApiRequest) {
  if (process.env.BOX_SERVER_PUBLIC_URL?.startsWith('https://')) return true;
  if (isInternalIdentityRequest(req)) {
    const value = req.headers['x-box-player-proto'];
    return (Array.isArray(value) ? value[0] : value) === 'https';
  }
  if (process.env.BOX_TRUST_PROXY === 'true') {
    const value = req.headers['x-forwarded-proto'];
    return (Array.isArray(value) ? value[0] : value) === 'https';
  }
  return false;
}

function setSessionCookie(req: NextApiRequest, res: NextApiResponse, token: string) {
  appendCookie(res, serialize(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie(req),
    path: '/',
    ...(process.env.BOX_PLAYER_COOKIE_DOMAIN
      ? { domain: process.env.BOX_PLAYER_COOKIE_DOMAIN.trim() }
      : {}),
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  }));
}

function clearSessionCookie(req: NextApiRequest, res: NextApiResponse) {
  appendCookie(res, serialize(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie(req),
    path: '/',
    ...(process.env.BOX_PLAYER_COOKIE_DOMAIN
      ? { domain: process.env.BOX_PLAYER_COOKIE_DOMAIN.trim() }
      : {}),
    maxAge: 0,
  }));
}

function normalizeSubjectId(value: string) {
  return value.replace(/-/g, '').toLowerCase();
}

function rowToIdentity(row: IdentityRow): RuntimePlayerIdentity {
  const subjectId = normalizeSubjectId(row.subject_id);
  return {
    subjectId,
    userId: row.user_id == null ? '' : String(row.user_id),
    username: row.username || '',
    displayName: row.display_name || '',
    avatar: row.avatar_hash || '',
    role: row.role || 'player',
    status: row.status || 'active',
    expiresAt: 0,
  };
}

function toView(identity: RuntimePlayerIdentity, dates: Partial<IdentityRow> = {}): PlayerAccountView {
  const iso = (value?: string | Date | null) => value ? new Date(value).toISOString() : undefined;
  return {
    subjectId: identity.subjectId,
    userId: identity.userId,
    username: identity.username,
    displayName: identity.displayName,
    avatar: identity.avatar,
    role: identity.role,
    status: identity.status,
    guest: !identity.userId,
    userKey: createPlayerUserKey(identity.subjectId, identitySecret()),
    createdAt: iso(dates.created_at),
    lastSeenAt: iso(dates.last_seen_at),
    registeredAt: iso(dates.registered_at),
    updatedAt: iso(dates.updated_at),
    firstSeenIp: dates.first_seen_ip || '',
    lastSeenIp: dates.last_seen_ip || '',
    registrationIp: dates.registration_ip || '',
    lastLoginAt: iso(dates.last_login_at),
    lastLoginIp: dates.last_login_ip || '',
    loginCount: Number(dates.login_count || 0),
    activeSessionCount: Number(dates.active_session_count || 0),
    adminNote: dates.admin_note || '',
    tags: Array.isArray(dates.tags) ? dates.tags : [],
    banReason: dates.ban_reason || '',
    bannedAt: iso(dates.banned_at),
    bannedUntil: iso(dates.banned_until),
  };
}

async function expireTemporaryBans(database: Pool) {
  await database.query(`
    UPDATE ${table('users')}
    SET status = 'active', ban_reason = '', banned_at = NULL, banned_until = NULL,
      updated_at = NOW()
    WHERE status = 'banned' AND banned_until IS NOT NULL AND banned_until <= NOW()
  `);
}

async function findSession(database: Pool, token: string, req: NextApiRequest) {
  if (!token || token.startsWith('guest.')) return null;
  const result = await database.query<IdentityRow>(`
    SELECT p.id AS subject_id, p.created_at, p.last_seen_at, p.first_seen_ip, p.last_seen_ip,
      u.id AS user_id, u.username, u.display_name, u.avatar_hash, u.role, u.status,
      u.created_at AS registered_at, u.updated_at, u.registration_ip,
      u.last_login_at, u.last_login_ip, u.login_count
    FROM ${table('sessions')} s
    JOIN ${table('principals')} p ON p.id = s.principal_id
    LEFT JOIN ${table('users')} u ON u.principal_id = p.id
    WHERE s.token_hash = $1 AND s.expires_at > NOW()
  `, [tokenHash(token)]);
  const row = result.rows[0];
  if (!row) return null;
  await database.query(`
    UPDATE ${table('sessions')} SET last_seen_at = NOW(), last_seen_ip = $2,
      expires_at = NOW() + INTERVAL '${SESSION_DAYS} days'
    WHERE token_hash = $1
  `, [tokenHash(token), requestIp(req)]);
  await database.query(`UPDATE ${table('principals')} SET last_seen_at = NOW(), last_seen_ip = $2 WHERE id = $1`, [row.subject_id, requestIp(req)]);
  return row;
}

export function isPlayerDatabaseEnabled() {
  return Boolean((process.env.BOX_DATABASE_URL || '').trim());
}

export async function checkPlayerDatabaseReady() {
  identitySecret();
  const database = getPool();
  if (!database) throw new Error('玩家身份服务需要配置 PostgreSQL');
  await initialize();
  await database.query('SELECT 1');
}

export async function resolvePlayerIdentity(req: NextApiRequest, res: NextApiResponse) {
  identitySecret();
  const database = getPool();
  if (!database) throw new Error('玩家身份服务需要配置 PostgreSQL');
  await initialize();
  const row = await findSession(database, sessionToken(req), req);
  if (!row?.user_id) throw new Error('AUTH_REQUIRED');
  return rowToIdentity(row);
}

export function createRuntimeIdentityAssertion(identity: RuntimePlayerIdentity) {
  const { expiresAt: _expiresAt, ...value } = identity;
  const configuredTtl = Number(process.env.BOX_RUNTIME_IDENTITY_TTL_MS);
  const ttlMs =
    Number.isFinite(configuredTtl) && configuredTtl >= 5_000
      ? configuredTtl
      : 5 * 60_000;
  return signRuntimePlayerIdentity(value, identitySecret(), ttlMs);
}

function validateRegistration(username: unknown, displayName: unknown, password: unknown) {
  const normalizedUsername = typeof username === 'string' ? username.trim() : '';
  const normalizedDisplayName = typeof displayName === 'string' ? displayName.trim() : '';
  if (!usernamePattern.test(normalizedUsername)) {
    throw new Error('用户名必须以字母开头，只能包含字母、数字和下划线，长度为 3 到 32 位');
  }
  if (!displayNamePattern.test(normalizedDisplayName)) {
    throw new Error('昵称长度必须为 1 到 32 个字符');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new Error('密码长度必须为 8 到 128 个字符');
  }
  return { username: normalizedUsername, displayName: normalizedDisplayName, password };
}

function derivePassword(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, value) => error ? reject(error) : resolve(value as Buffer));
  });
}

async function recordAuthFailure(
  database: Pool,
  req: NextApiRequest,
  username: string,
  reason: 'invalid_credentials' | 'banned',
) {
  await database.query(`
    INSERT INTO ${table('auth_failures')} (username, reason, ip_address, user_agent)
    VALUES ($1, $2, $3, $4)
  `, [username.slice(0, 64), reason, requestIp(req), requestUserAgent(req)]);
}

export async function registerPlayer(
  req: NextApiRequest,
  res: NextApiResponse,
  values: { username?: unknown; displayName?: unknown; password?: unknown },
) {
  if (process.env.BOX_PLAYER_REGISTRATION_ENABLED === 'false') {
    throw new Error('服主已关闭玩家注册');
  }
  const database = getPool();
  if (!database) throw new Error('玩家账号功能需要配置 PostgreSQL');
  await initialize();
  const existing = await findSession(database, sessionToken(req), req);
  if (existing?.user_id) throw new Error('当前已经登录');
  const input = validateRegistration(values.username, values.displayName, values.password);
  const salt = randomBytes(16).toString('base64url');
  const hash = (await derivePassword(input.password, salt)).toString('base64url');
  const subjectUUID = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const ip = requestIp(req);
  const userAgent = requestUserAgent(req);
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO ${table('principals')} (id, kind, first_seen_ip, last_seen_ip)
      VALUES ($1, 'user', $2, $2)
    `, [subjectUUID, ip]);
    const result = await client.query<IdentityRow>(`
      WITH inserted AS (
        INSERT INTO ${table('users')}
          (principal_id, username, display_name, password_salt, password_hash,
           registration_ip, last_login_at, last_login_ip, login_count)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $6, 1)
        RETURNING id, principal_id, username, display_name, avatar_hash, role, status,
          created_at AS registered_at, updated_at, registration_ip,
          last_login_at, last_login_ip, login_count
      )
      SELECT p.id AS subject_id, p.created_at, p.last_seen_at, p.first_seen_ip, p.last_seen_ip,
        u.id AS user_id, u.username, u.display_name, u.avatar_hash, u.role, u.status,
        u.registered_at, u.updated_at, u.registration_ip,
        u.last_login_at, u.last_login_ip, u.login_count
      FROM ${table('principals')} p JOIN inserted u ON u.principal_id = p.id
    `, [subjectUUID, input.username, input.displayName, salt, hash, ip]);
    await client.query(`
      INSERT INTO ${table('sessions')}
        (token_hash, principal_id, expires_at, created_ip, last_seen_ip, user_agent)
      VALUES ($1, $2, NOW() + INTERVAL '${SESSION_DAYS} days', $3, $3, $4)
    `, [tokenHash(token), subjectUUID, ip, userAgent]);
    await client.query(`
      INSERT INTO ${table('login_events')} (principal_id, ip_address, user_agent)
      VALUES ($1, $2, $3)
    `, [subjectUUID, ip, userAgent]);
    const row = result.rows[0];
    if (!row) throw new Error('账号创建失败');
    await client.query('COMMIT');
    setSessionCookie(req, res, token);
    return toView(rowToIdentity(row), row);
  } catch (error) {
    await client.query('ROLLBACK');
    if ((error as { code?: string }).code === '23505') throw new Error('用户名已经存在');
    throw error;
  } finally {
    client.release();
  }
}

export async function loginPlayer(
  req: NextApiRequest,
  res: NextApiResponse,
  values: { username?: unknown; password?: unknown },
) {
  const database = getPool();
  if (!database) throw new Error('玩家账号功能需要配置 PostgreSQL');
  await initialize();
  await expireTemporaryBans(database);
  const username = typeof values.username === 'string' ? values.username.trim() : '';
  const password = typeof values.password === 'string' ? values.password : '';
  const result = await database.query<IdentityRow & { password_salt: string; password_hash: string }>(`
    SELECT p.id AS subject_id, p.created_at, p.last_seen_at, p.first_seen_ip, p.last_seen_ip,
      u.id AS user_id, u.username, u.display_name, u.avatar_hash, u.role, u.status,
      u.created_at AS registered_at, u.updated_at, u.registration_ip,
      u.last_login_at, u.last_login_ip, u.login_count,
      u.password_salt, u.password_hash
    FROM ${table('users')} u JOIN ${table('principals')} p ON p.id = u.principal_id
    WHERE LOWER(u.username) = LOWER($1)
  `, [username]);
  const row = result.rows[0];
  // 即使用户名不存在也执行同样成本的 scrypt，降低按响应时间枚举账号的风险。
  const fallbackSalt = 'box-local-missing-user';
  const derived = await derivePassword(password, row?.password_salt || fallbackSalt);
  const expected = row
    ? Buffer.from(row.password_hash, 'base64url')
    : await derivePassword('box-local-invalid-password', fallbackSalt);
  if (!row || derived.length !== expected.length || !timingSafeEqual(derived, expected)) {
    await recordAuthFailure(database, req, username, 'invalid_credentials');
    throw new Error('用户名或密码错误');
  }
  if (row.status === 'banned') {
    await recordAuthFailure(database, req, username, 'banned');
    throw new Error('该玩家已被封禁');
  }
  const oldToken = sessionToken(req);
  const token = randomBytes(32).toString('base64url');
  const ip = requestIp(req);
  const userAgent = requestUserAgent(req);
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    if (oldToken) {
      await client.query(`DELETE FROM ${table('sessions')} WHERE token_hash = $1`, [tokenHash(oldToken)]);
    }
    await client.query(`
      INSERT INTO ${table('sessions')}
        (token_hash, principal_id, expires_at, created_ip, last_seen_ip, user_agent)
      VALUES ($1, $2, NOW() + INTERVAL '${SESSION_DAYS} days', $3, $3, $4)
    `, [tokenHash(token), row.subject_id, ip, userAgent]);
    await client.query(`
      UPDATE ${table('users')} SET last_login_at = NOW(), last_login_ip = $2,
        login_count = login_count + 1, updated_at = NOW()
      WHERE principal_id = $1
    `, [row.subject_id, ip]);
    await client.query(`
      UPDATE ${table('principals')} SET last_seen_at = NOW(), last_seen_ip = $2 WHERE id = $1
    `, [row.subject_id, ip]);
    await client.query(`
      INSERT INTO ${table('login_events')} (principal_id, ip_address, user_agent)
      VALUES ($1, $2, $3)
    `, [row.subject_id, ip, userAgent]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  setSessionCookie(req, res, token);
  return toView(rowToIdentity(row), {
    ...row,
    last_seen_at: new Date(),
    last_seen_ip: ip,
    last_login_at: new Date(),
    last_login_ip: ip,
    login_count: Number(row.login_count || 0) + 1,
  });
}

export async function logoutPlayer(req: NextApiRequest, res: NextApiResponse) {
  const database = getPool();
  const token = sessionToken(req);
  if (database && token) {
    await initialize();
    await database.query(`DELETE FROM ${table('sessions')} WHERE token_hash = $1`, [tokenHash(token)]);
  }
  clearSessionCookie(req, res);
}

export async function currentPlayer(req: NextApiRequest, res: NextApiResponse) {
  let identity: RuntimePlayerIdentity | null = null;
  try {
    identity = await resolvePlayerIdentity(req, res);
  } catch (error) {
    if ((error as Error).message !== 'AUTH_REQUIRED') throw error;
  }
  return {
    player: identity ? toView(identity) : null,
    databaseEnabled: isPlayerDatabaseEnabled(),
    registrationEnabled: process.env.BOX_PLAYER_REGISTRATION_ENABLED !== 'false',
  };
}

export async function listManagedPlayers(options: ManagedPlayerListOptions = {}): Promise<ManagedPlayerList> {
  const database = getPool();
  if (!database) throw new Error('玩家管理需要配置 PostgreSQL');
  await initialize();
  await expireTemporaryBans(database);
  const normalized = (options.search || '').trim().slice(0, 64);
  const pageSize = Math.max(10, Math.min(100, Math.trunc(options.pageSize || 30)));
  const page = Math.max(1, Math.trunc(options.page || 1));
  const identity = ['all', 'user', 'banned'].includes(options.identity || '') ? options.identity : 'all';
  const role = ['player', 'moderator', 'admin'].includes(options.role || '') ? options.role : 'all';
  const online = ['online', 'offline'].includes(options.online || '') ? options.online : 'all';
  const orderBy = {
    lastSeen: 'p.last_seen_at DESC',
    registered: 'u.created_at DESC NULLS LAST',
    displayName: 'u.display_name ASC NULLS LAST',
    loginCount: 'u.login_count DESC NULLS LAST',
  }[options.sort || 'lastSeen'] || 'p.last_seen_at DESC';
  const values: unknown[] = [normalized, identity, role, online];
  const where = `
    ($1 = '' OR u.username ILIKE '%' || $1 || '%'
      OR u.display_name ILIKE '%' || $1 || '%'
      OR u.admin_note ILIKE '%' || $1 || '%'
      OR $1 = ANY(u.tags)
      OR CAST(u.id AS TEXT) = $1 OR CAST(p.id AS TEXT) ILIKE $1 || '%')
    AND ($2 = 'all' OR ($2 = 'user' AND u.id IS NOT NULL) OR ($2 = 'banned' AND u.status = 'banned'))
    AND ($3 = 'all' OR u.role = $3)
    AND ($4 = 'all' OR ($4 = 'online' AND EXISTS (
      SELECT 1 FROM ${table('sessions')} sx WHERE sx.principal_id = p.id AND sx.expires_at > NOW()
    )) OR ($4 = 'offline' AND NOT EXISTS (
      SELECT 1 FROM ${table('sessions')} sx WHERE sx.principal_id = p.id AND sx.expires_at > NOW()
    )))
  `;
  const countResult = await database.query<{ total: string }>(`
    SELECT COUNT(*) AS total
    FROM ${table('principals')} p
    LEFT JOIN ${table('users')} u ON u.principal_id = p.id
    WHERE ${where}
  `, values);
  const total = Number(countResult.rows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  values.push(pageSize, (safePage - 1) * pageSize);
  const result = await database.query<IdentityRow>(`
    SELECT p.id AS subject_id, p.created_at, p.last_seen_at, p.first_seen_ip, p.last_seen_ip,
      u.id AS user_id, u.username, u.display_name, u.avatar_hash, u.role, u.status,
      u.created_at AS registered_at, u.updated_at, u.registration_ip,
      u.last_login_at, u.last_login_ip, u.login_count, u.admin_note, u.tags,
      u.ban_reason, u.banned_at, u.banned_until,
      (SELECT COUNT(*) FROM ${table('sessions')} s
        WHERE s.principal_id = p.id AND s.expires_at > NOW()) AS active_session_count
    FROM ${table('principals')} p
    LEFT JOIN ${table('users')} u ON u.principal_id = p.id
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT $5 OFFSET $6
  `, values);
  return {
    players: result.rows.map((row) => toView(rowToIdentity(row), row)),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function getPlayerAdminOverview(): Promise<PlayerAdminOverview> {
  const database = getPool();
  if (!database) throw new Error('玩家管理需要配置 PostgreSQL');
  await initialize();
  await expireTemporaryBans(database);
  const [totalsResult, loginResult, auditResult] = await Promise.all([
    database.query<{
      identities: string; users: string; guests: string; banned: string;
      active_sessions: string; active_last_24_hours: string; new_last_7_days: string;
      logins_last_24_hours: string; failed_logins_last_24_hours: string;
      unique_login_ips_last_7_days: string;
      moderators: string; admins: string;
    }>(`
      SELECT
        COUNT(*) AS identities,
        COUNT(u.id) AS users,
        COUNT(*) FILTER (WHERE u.id IS NULL) AS guests,
        COUNT(*) FILTER (WHERE u.status = 'banned') AS banned,
        (SELECT COUNT(*) FROM ${table('sessions')} WHERE expires_at > NOW()) AS active_sessions,
        COUNT(*) FILTER (WHERE p.last_seen_at >= NOW() - INTERVAL '24 hours') AS active_last_24_hours,
        COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days') AS new_last_7_days,
        (SELECT COUNT(*) FROM ${table('login_events')} WHERE created_at >= NOW() - INTERVAL '24 hours') AS logins_last_24_hours,
        (SELECT COUNT(*) FROM ${table('auth_failures')} WHERE created_at >= NOW() - INTERVAL '24 hours') AS failed_logins_last_24_hours,
        (SELECT COUNT(DISTINCT NULLIF(ip_address, '')) FROM ${table('login_events')} WHERE created_at >= NOW() - INTERVAL '7 days') AS unique_login_ips_last_7_days,
        COUNT(*) FILTER (WHERE u.role = 'moderator') AS moderators,
        COUNT(*) FILTER (WHERE u.role = 'admin') AS admins
      FROM ${table('principals')} p
      LEFT JOIN ${table('users')} u ON u.principal_id = p.id
    `),
    database.query<{
      subject_id: string; display_name: string | null; username: string | null;
      ip_address: string; user_agent: string; created_at: string | Date;
    }>(`
      SELECT e.principal_id AS subject_id, u.display_name, u.username,
        e.ip_address, e.user_agent, e.created_at
      FROM ${table('login_events')} e
      LEFT JOIN ${table('users')} u ON u.principal_id = e.principal_id
      ORDER BY e.created_at DESC
      LIMIT 30
    `),
    database.query<{
      id: string | number; action: string; subject_id: string | null;
      details: Record<string, unknown>; created_at: string | Date;
    }>(`
      SELECT id, action, subject_id, details, created_at
      FROM ${table('audit_logs')}
      ORDER BY created_at DESC
      LIMIT 30
    `),
  ]);
  const totals = totalsResult.rows[0];
  return {
    totals: {
      identities: Number(totals?.identities || 0),
      users: Number(totals?.users || 0),
      guests: Number(totals?.guests || 0),
      banned: Number(totals?.banned || 0),
      activeSessions: Number(totals?.active_sessions || 0),
      activeLast24Hours: Number(totals?.active_last_24_hours || 0),
      newLast7Days: Number(totals?.new_last_7_days || 0),
      loginsLast24Hours: Number(totals?.logins_last_24_hours || 0),
      failedLoginsLast24Hours: Number(totals?.failed_logins_last_24_hours || 0),
      uniqueLoginIpsLast7Days: Number(totals?.unique_login_ips_last_7_days || 0),
      moderators: Number(totals?.moderators || 0),
      admins: Number(totals?.admins || 0),
    },
    recentLogins: loginResult.rows.map((event) => ({
      subjectId: normalizeSubjectId(event.subject_id),
      displayName: event.display_name || `玩家${normalizeSubjectId(event.subject_id).slice(-6)}`,
      username: event.username || '',
      ip: event.ip_address || '',
      userAgent: event.user_agent || '',
      createdAt: new Date(event.created_at).toISOString(),
    })),
    recentAudits: auditResult.rows.map((event) => ({
      id: String(event.id),
      action: event.action,
      subjectId: event.subject_id ? normalizeSubjectId(event.subject_id) : '',
      details: event.details || {},
      createdAt: new Date(event.created_at).toISOString(),
    })),
  };
}

export async function getManagedPlayerDetails(subjectId: string): Promise<ManagedPlayerDetails> {
  const database = getPool();
  if (!database) throw new Error('玩家管理需要配置 PostgreSQL');
  await initialize();
  await expireTemporaryBans(database);
  const result = await database.query<IdentityRow>(`
    SELECT p.id AS subject_id, p.created_at, p.last_seen_at, p.first_seen_ip, p.last_seen_ip,
      u.id AS user_id, u.username, u.display_name, u.avatar_hash, u.role, u.status,
      u.created_at AS registered_at, u.updated_at, u.registration_ip,
      u.last_login_at, u.last_login_ip, u.login_count, u.admin_note, u.tags,
      u.ban_reason, u.banned_at, u.banned_until,
      (SELECT COUNT(*) FROM ${table('sessions')} s
        WHERE s.principal_id = p.id AND s.expires_at > NOW()) AS active_session_count
    FROM ${table('principals')} p
    LEFT JOIN ${table('users')} u ON u.principal_id = p.id
    WHERE p.id = $1
  `, [subjectId]);
  const row = result.rows[0];
  if (!row) throw new Error('玩家不存在');
  const sessions = await database.query<{
    session_id: string;
    created_at: string | Date;
    last_seen_at: string | Date;
    expires_at: string | Date;
    created_ip: string;
    last_seen_ip: string;
    user_agent: string;
  }>(`
    SELECT LEFT(token_hash, 16) AS session_id, created_at, last_seen_at, expires_at,
      created_ip, last_seen_ip, user_agent
    FROM ${table('sessions')}
    WHERE principal_id = $1 AND expires_at > NOW()
    ORDER BY last_seen_at DESC
    LIMIT 20
  `, [subjectId]);
  const history = await database.query<{
    created_at: string | Date;
    ip_address: string;
    user_agent: string;
  }>(`
    SELECT created_at, ip_address, user_agent
    FROM ${table('login_events')}
    WHERE principal_id = $1
    ORDER BY created_at DESC
    LIMIT 20
  `, [subjectId]);
  return {
    player: toView(rowToIdentity(row), row),
    sessions: sessions.rows.map((session) => ({
      sessionId: session.session_id,
      createdAt: new Date(session.created_at).toISOString(),
      lastSeenAt: new Date(session.last_seen_at).toISOString(),
      expiresAt: new Date(session.expires_at).toISOString(),
      createdIp: session.created_ip || '',
      lastSeenIp: session.last_seen_ip || '',
      userAgent: session.user_agent || '',
    })),
    loginHistory: history.rows.map((event) => ({
      createdAt: new Date(event.created_at).toISOString(),
      ip: event.ip_address || '',
      userAgent: event.user_agent || '',
    })),
  };
}

async function audit(
  client: Pool | PoolClient,
  action: string,
  subjectId: string,
  details: unknown,
  context?: AdminActionContext,
) {
  await client.query(`
    INSERT INTO ${table('audit_logs')} (actor, action, subject_id, details)
    VALUES ($1, $2, $3, $4::jsonb)
  `, [context?.actor || 'server-owner', action, subjectId, JSON.stringify({
    ...(details && typeof details === 'object' ? details : {}),
    actorDisplayName: context?.actorDisplayName || '服主密钥',
    actorRole: context?.actorRole || 'owner',
    actorIp: context?.ip || '',
    actorUserAgent: context?.userAgent || '',
  })]);
}

export async function listPlayerAdminActivity(options: {
  kind?: 'all' | 'login' | 'admin';
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PlayerAdminActivity> {
  const database = getPool();
  if (!database) throw new Error('玩家管理需要配置 PostgreSQL');
  await initialize();
  const kind = ['login', 'admin'].includes(options.kind || '') ? options.kind : 'all';
  const search = (options.search || '').trim().slice(0, 64);
  const pageSize = Math.max(10, Math.min(100, Math.trunc(options.pageSize || 30)));
  const page = Math.max(1, Math.trunc(options.page || 1));
  const eventQuery = `
    WITH events AS (
      SELECT 'login'::text AS kind, 'login:' || e.id::text AS id,
        'login.success'::text AS action, 'player:' || REPLACE(e.principal_id::text, '-', '') AS actor,
        COALESCE(u.display_name, '') AS actor_display_name,
        e.principal_id AS subject_id, COALESCE(u.display_name, '') AS display_name,
        COALESCE(u.username, '') AS username, e.ip_address AS ip,
        e.user_agent, '{}'::jsonb AS details, e.created_at
      FROM ${table('login_events')} e
      LEFT JOIN ${table('users')} u ON u.principal_id = e.principal_id
      UNION ALL
      SELECT 'login'::text AS kind, 'failure:' || f.id::text AS id,
        'login.failed'::text AS action, 'anonymous'::text AS actor,
        f.username AS actor_display_name, NULL::uuid AS subject_id,
        f.username AS display_name, f.username, f.ip_address AS ip,
        f.user_agent, jsonb_build_object('reason', f.reason) AS details, f.created_at
      FROM ${table('auth_failures')} f
      UNION ALL
      SELECT 'admin'::text AS kind, 'audit:' || a.id::text AS id,
        a.action, a.actor, COALESCE(a.details->>'actorDisplayName', a.actor) AS actor_display_name,
        a.subject_id, COALESCE(u.display_name, '') AS display_name,
        COALESCE(u.username, '') AS username, COALESCE(a.details->>'actorIp', '') AS ip,
        COALESCE(a.details->>'actorUserAgent', '') AS user_agent,
        a.details, a.created_at
      FROM ${table('audit_logs')} a
      LEFT JOIN ${table('users')} u ON u.principal_id = a.subject_id
    )
  `;
  const where = `
    ($1 = 'all' OR kind = $1)
    AND ($2 = '' OR action ILIKE '%' || $2 || '%'
      OR actor ILIKE '%' || $2 || '%' OR actor_display_name ILIKE '%' || $2 || '%'
      OR display_name ILIKE '%' || $2 || '%' OR username ILIKE '%' || $2 || '%'
      OR COALESCE(subject_id::text, '') ILIKE $2 || '%' OR ip ILIKE $2 || '%')
  `;
  const count = await database.query<{ total: string }>(`${eventQuery} SELECT COUNT(*) AS total FROM events WHERE ${where}`, [kind, search]);
  const total = Number(count.rows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const result = await database.query<{
    id: string; kind: 'login' | 'admin'; action: string; actor: string;
    actor_display_name: string; subject_id: string | null; display_name: string;
    username: string; ip: string; user_agent: string; details: Record<string, unknown>;
    created_at: string | Date;
  }>(`${eventQuery}
    SELECT * FROM events WHERE ${where}
    ORDER BY created_at DESC, id DESC LIMIT $3 OFFSET $4
  `, [kind, search, pageSize, (safePage - 1) * pageSize]);
  return {
    events: result.rows.map((event) => ({
      id: event.id,
      kind: event.kind,
      action: event.action,
      actor: event.actor,
      actorDisplayName: event.actor_display_name || event.actor,
      subjectId: event.subject_id ? normalizeSubjectId(event.subject_id) : '',
      displayName: event.display_name || '',
      username: event.username || '',
      ip: event.ip || '',
      userAgent: event.user_agent || '',
      details: event.details || {},
      createdAt: new Date(event.created_at).toISOString(),
    })),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

async function publishPlayerRevocation(
  client: Pool | PoolClient,
  subjectId: string,
  reason: 'sessions-revoked' | 'banned' | 'deleted',
) {
  const result = await client.query<{ id: string }>(`
    INSERT INTO ${table('player_revocations')} (subject_id, reason)
    VALUES ($1, $2)
    RETURNING id::text
  `, [subjectId, reason]);
  return result.rows[0]?.id || '';
}

export async function listPlayerRevocations(
  after: number,
  since: Date,
  limit = 500,
) {
  const database = getPool();
  if (!database) throw new Error('玩家管理需要配置 PostgreSQL');
  await initialize();
  const result = await database.query<{
    id: string;
    subject_id: string;
    reason: string;
    created_at: string | Date;
  }>(`
    SELECT id::text, REPLACE(subject_id::text, '-', '') AS subject_id,
      reason, created_at
    FROM ${table('player_revocations')}
    WHERE id > $1 AND created_at >= $2
    ORDER BY id ASC
    LIMIT $3
  `, [after, since, Math.max(1, Math.min(500, limit))]);
  const events = result.rows.map((row) => ({
    id: row.id,
    subjectId: row.subject_id,
    reason: row.reason,
    createdAt: new Date(row.created_at).toISOString(),
  }));
  return {
    cursor: events.length ? events[events.length - 1].id : String(after),
    events,
  };
}

export async function updateManagedPlayer(
  subjectId: string,
  changes: {
    displayName?: unknown; role?: unknown; status?: unknown; avatar?: unknown;
    adminNote?: unknown; tags?: unknown; banReason?: unknown; bannedUntil?: unknown;
  },
  context?: AdminActionContext,
) {
  const database = getPool();
  if (!database) throw new Error('玩家管理需要配置 PostgreSQL');
  await initialize();
  const displayName = typeof changes.displayName === 'string' ? changes.displayName.trim() : undefined;
  const avatar = typeof changes.avatar === 'string' ? changes.avatar.trim() : undefined;
  const role = changes.role as LocalPlayerRole | undefined;
  const status = changes.status as LocalPlayerStatus | undefined;
  const adminNote = typeof changes.adminNote === 'string' ? changes.adminNote.trim() : undefined;
  const tags = Array.isArray(changes.tags)
    ? [...new Set(changes.tags.map((tag) => String(tag).trim()).filter(Boolean))]
    : undefined;
  const banReason = typeof changes.banReason === 'string' ? changes.banReason.trim() : undefined;
  const bannedUntil = changes.bannedUntil === '' || changes.bannedUntil == null
    ? null
    : new Date(String(changes.bannedUntil));
  if (displayName !== undefined && !displayNamePattern.test(displayName)) throw new Error('昵称长度必须为 1 到 32 个字符');
  if (avatar !== undefined && avatar.length > 2048) throw new Error('头像地址过长');
  if (role !== undefined && !['player', 'moderator', 'admin'].includes(role)) throw new Error('角色无效');
  if (status !== undefined && !['active', 'banned'].includes(status)) throw new Error('状态无效');
  if (adminNote !== undefined && adminNote.length > 2000) throw new Error('服主备注不能超过 2000 个字符');
  if (tags && (tags.length > 20 || tags.some((tag) => tag.length > 32))) throw new Error('最多设置 20 个标签，每个不超过 32 个字符');
  if (banReason !== undefined && banReason.length > 500) throw new Error('封禁原因不能超过 500 个字符');
  if (bannedUntil && Number.isNaN(bannedUntil.getTime())) throw new Error('封禁截止时间无效');
  if (status === 'banned' && bannedUntil && bannedUntil <= new Date()) throw new Error('封禁截止时间必须晚于当前时间');
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const previous = await client.query<{ status: LocalPlayerStatus }>(`
      SELECT status FROM ${table('users')} WHERE principal_id = $1 FOR UPDATE
    `, [subjectId]);
    if (!previous.rows[0]) throw new Error('只能修改已经注册的玩家');
    const result = await client.query<IdentityRow>(`
      UPDATE ${table('users')} SET
        display_name = COALESCE($2, display_name),
        avatar_hash = COALESCE($3, avatar_hash),
        role = COALESCE($4, role),
        status = COALESCE($5, status),
        admin_note = COALESCE($6, admin_note),
        tags = COALESCE($7, tags),
        ban_reason = CASE WHEN $5 = 'active' THEN '' ELSE COALESCE($8, ban_reason) END,
        banned_at = CASE WHEN $5 = 'banned' AND status <> 'banned' THEN NOW() WHEN $5 = 'active' THEN NULL ELSE banned_at END,
        banned_until = CASE WHEN $5 = 'active' THEN NULL WHEN $5 = 'banned' THEN $9 ELSE banned_until END,
        updated_at = NOW()
      WHERE principal_id = $1
      RETURNING principal_id AS subject_id
    `, [subjectId, displayName, avatar, role, status, adminNote, tags, banReason, bannedUntil]);
    if (!result.rows[0]) throw new Error('只能修改已经注册的玩家');
    if (status === 'banned' && previous.rows[0].status !== 'banned') {
      await client.query(`DELETE FROM ${table('sessions')} WHERE principal_id = $1`, [subjectId]);
      await publishPlayerRevocation(client, subjectId, 'banned');
    }
    await audit(client, 'player.update', subjectId, {
      displayName, avatar, role, status, adminNote,
      tags, banReason, bannedUntil: bannedUntil?.toISOString() || null,
    }, context);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return (await getManagedPlayerDetails(subjectId)).player;
}

export async function revokeManagedPlayerSession(
  subjectId: string,
  sessionId: string,
  context?: AdminActionContext,
) {
  if (!/^[0-9a-f]{16}$/i.test(sessionId)) throw new Error('会话标识无效');
  const database = getPool();
  if (!database) throw new Error('玩家管理需要配置 PostgreSQL');
  await initialize();
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      DELETE FROM ${table('sessions')}
      WHERE principal_id = $1 AND LEFT(token_hash, 16) = LOWER($2)
    `, [subjectId, sessionId]);
    if (!result.rowCount) throw new Error('会话不存在或已经失效');
    const eventId = await publishPlayerRevocation(client, subjectId, 'sessions-revoked');
    await audit(client, 'player.session.revoke', subjectId, { sessionId, eventId }, context);
    await client.query('COMMIT');
    return { revoked: 1, eventId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeManagedPlayerSessions(subjectId: string, context?: AdminActionContext) {
  const database = getPool();
  if (!database) throw new Error('玩家管理需要配置 PostgreSQL');
  await initialize();
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query(`SELECT 1 FROM ${table('principals')} WHERE id = $1`, [subjectId]);
    if (!exists.rowCount) throw new Error('玩家不存在');
    const result = await client.query(`DELETE FROM ${table('sessions')} WHERE principal_id = $1`, [subjectId]);
    const eventId = await publishPlayerRevocation(client, subjectId, 'sessions-revoked');
    await audit(client, 'player.sessions.revoke', subjectId, {
      revoked: result.rowCount || 0,
      eventId,
    }, context);
    await client.query('COMMIT');
    return { revoked: result.rowCount || 0, eventId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function resetManagedPlayerPassword(
  subjectId: string,
  password: unknown,
  context?: AdminActionContext,
) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new Error('新密码长度必须为 8 到 128 个字符');
  }
  const database = getPool();
  if (!database) throw new Error('玩家管理需要配置 PostgreSQL');
  await initialize();
  const salt = randomBytes(16).toString('base64url');
  const hash = (await derivePassword(password, salt)).toString('base64url');
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query(`
      UPDATE ${table('users')}
      SET password_salt = $2, password_hash = $3, updated_at = NOW()
      WHERE principal_id = $1
    `, [subjectId, salt, hash]);
    if (!updated.rowCount) throw new Error('只能重置已经注册的玩家密码');
    const sessions = await client.query(`DELETE FROM ${table('sessions')} WHERE principal_id = $1`, [subjectId]);
    const eventId = await publishPlayerRevocation(client, subjectId, 'sessions-revoked');
    await audit(client, 'player.password.reset', subjectId, {
      revoked: sessions.rowCount || 0,
      eventId,
    }, context);
    await client.query('COMMIT');
    return { reset: true, revoked: sessions.rowCount || 0, eventId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export type ManagedPlayerBatchAction =
  | 'revoke-sessions'
  | 'ban'
  | 'unban'
  | 'add-tag'
  | 'remove-tag';

export async function batchManagePlayers(
  subjectIds: unknown,
  action: unknown,
  payload: { reason?: unknown; bannedUntil?: unknown; tag?: unknown } = {},
  context?: AdminActionContext,
) {
  if (!Array.isArray(subjectIds)) throw new Error('请选择要操作的玩家');
  const ids = [...new Set(subjectIds.map(String))].filter((id) => /^[0-9a-f]{32}$/i.test(id));
  if (!ids.length) throw new Error('请选择有效的玩家');
  if (ids.length > 100) throw new Error('单次最多管理 100 位玩家');
  if (!['revoke-sessions', 'ban', 'unban', 'add-tag', 'remove-tag'].includes(String(action))) {
    throw new Error('不支持的批量操作');
  }
  const batchAction = action as ManagedPlayerBatchAction;
  const tag = typeof payload.tag === 'string' ? payload.tag.trim() : '';
  if ((batchAction === 'add-tag' || batchAction === 'remove-tag') && (!tag || tag.length > 32)) {
    throw new Error('标签长度必须为 1 到 32 个字符');
  }
  const results: Array<{ subjectId: string; ok: boolean; message?: string }> = [];
  for (const subjectId of ids) {
    try {
      if (context?.subjectId && context.subjectId === subjectId
        && ['revoke-sessions', 'ban'].includes(batchAction)) {
        throw new Error('不能对当前正在操作的管理员账号执行此操作');
      }
      if (context?.actorRole === 'moderator') {
        const target = await getManagedPlayerDetails(subjectId);
        if (target.player.role !== 'player') throw new Error('管理员不能管理其他管理角色');
      }
      if (batchAction === 'revoke-sessions') {
        await revokeManagedPlayerSessions(subjectId, context);
      } else if (batchAction === 'ban') {
        await updateManagedPlayer(subjectId, {
          status: 'banned',
          banReason: payload.reason,
          bannedUntil: payload.bannedUntil,
        }, context);
      } else if (batchAction === 'unban') {
        await updateManagedPlayer(subjectId, { status: 'active' }, context);
      } else {
        const details = await getManagedPlayerDetails(subjectId);
        const tags = batchAction === 'add-tag'
          ? [...new Set([...details.player.tags, tag])]
          : details.player.tags.filter((value) => value !== tag);
        await updateManagedPlayer(subjectId, { tags }, context);
      }
      results.push({ subjectId, ok: true });
    } catch (error) {
      results.push({ subjectId, ok: false, message: (error as Error).message });
    }
  }
  return {
    action: batchAction,
    requested: ids.length,
    succeeded: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}

export async function deleteManagedPlayer(subjectId: string, context?: AdminActionContext) {
  const database = getPool();
  if (!database) throw new Error('玩家管理需要配置 PostgreSQL');
  await initialize();
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    await audit(client, 'player.delete', subjectId, {}, context);
    await publishPlayerRevocation(client, subjectId, 'deleted');
    const result = await client.query(`DELETE FROM ${table('principals')} WHERE id = $1`, [subjectId]);
    if (!result.rowCount) throw new Error('玩家不存在');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
