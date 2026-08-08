import { createConfig, initLocalEnv } from '@box-local/env';
import { maybeN, maybeS, removeConfigUndefined } from '@box-local/utils/config-check';
import { maybeStringArray } from './builder';
import { config } from './index';

/**
 * 来自环境变量中的配置
 * 包含CI配置和固定配置
 */
export type EnvironmentConfig = typeof config;
export type EnvConfig = EnvironmentConfig & Partial<RemoteConfig>;
let _env: EnvConfig;

export function getEnvironmentConfig(): EnvConfig {
  if (!_env) {
    initLocalEnv();
    _env = removeConfigUndefined({
      ...config,

      // 覆盖 Nacos 配置，本地开发用
      INTRANET_BACKEND_SERVER_URL: maybeS(
        process.env.INTRANET_BACKEND_SERVER_URL,
      ),
      INTRANET_MAAS_BACKEND_SERVER_URL: maybeS(
        process.env.INTRANET_MAAS_BACKEND_SERVER_URL,
      ),
      INTRANET_CREATERA_BACKEND_SERVER_URL: maybeS(
        process.env.INTRANET_CREATERA_BACKEND_SERVER_URL,
      ),
      BUILD_SERVER_URL: maybeS(process.env.BUILD_SERVER_URL),
      FEATURE_FLAGS: maybeStringArray(process.env.FEATURE_FLAGS),
      RABBITMQ_HOST_URL: maybeS(process.env.RABBITMQ_HOST_URL),
      REDIS_HOST: maybeS(process.env.REDIS_HOST),
      REDIS_PORT: maybeN(process.env.REDIS_PORT),
      REDIS_PASSWORD: maybeS(process.env.REDIS_PASSWORD),
      REDIS_DB: maybeN(process.env.REDIS_DB),
      STORAGE_CACHE_REDIS_DB: maybeN(process.env.STORAGE_CACHE_REDIS_DB),
      STORAGE_CACHE_REDIS_TTL: maybeN(process.env.STORAGE_CACHE_REDIS_TTL),
      INTRANET_STORAGE_BACKEND_SERVER_URL: maybeS(
        process.env.INTRANET_STORAGE_BACKEND_SERVER_URL,
      ),
      INTRANET_BOX_API_URL: maybeS(process.env.INTRANET_BOX_API_URL),
      AI_MODEL_MAPPING: process.env.AI_MODEL_MAPPING
        ? JSON.parse(process.env.AI_MODEL_MAPPING)
        : undefined,
    });
  }

  return _env;
}

export type RemoteConfig = Awaited<ReturnType<typeof getTypedConfig>>;
export type ServerRuntimeConfig = RemoteConfig & EnvironmentConfig;

let _syncConfig: ServerRuntimeConfig;
let _config: Promise<ServerRuntimeConfig>;

export async function getConfig(): Promise<ServerRuntimeConfig> {
  if (!_config) {
    const environmentConfig = getEnvironmentConfig();
    validateLocalRuntimeEnvironment(environmentConfig);
    _config = getTypedConfig(environmentConfig);
  }
  _syncConfig = await _config;
  return _syncConfig;
}

function validateLocalRuntimeEnvironment(config: EnvConfig): void {
  if (config.method !== 'local') return;

  const redisTtl = config.STORAGE_CACHE_REDIS_TTL;
  if (
    redisTtl !== undefined &&
    (!Number.isInteger(redisTtl) || redisTtl < 0 || redisTtl > 255)
  ) {
    throw new Error(
      `本地配置错误：STORAGE_CACHE_REDIS_TTL=${redisTtl}，必须是 0 到 255 的整数。`,
    );
  }

  const storageDriver = String(config.dataStorageDriver || 'local').toLowerCase();
  if (
    (storageDriver === 'postgres' || storageDriver === 'postgresql') &&
    !String(config.databaseUrl || '').trim()
  ) {
    throw new Error(
      '本地配置错误：BOX_DATA_STORAGE_DRIVER=postgres 时必须配置 BOX_DATABASE_URL。',
    );
  }

  if (
    (storageDriver === 'legacy' || storageDriver === 'remote') &&
    !String(config.INTRANET_STORAGE_BACKEND_SERVER_URL || '').trim()
  ) {
    throw new Error(
      '本地配置错误：legacy/remote Storage 需要 INTRANET_STORAGE_BACKEND_SERVER_URL；纯本地运行请设置 BOX_DATA_STORAGE_DRIVER=local。',
    );
  }
}

export function getConfigSync() {
  return _syncConfig;
}

async function getTypedConfig(config: EnvironmentConfig) {
  return createConfig('game-server', config);
}
