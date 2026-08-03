import Ajv from 'ajv/dist/jtd';
import defineDebug from 'debug';
import { config } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { mergeDeepRight, mergeDeepWith, defaultTo } from 'ramda';
import { parse } from 'yaml';
import GlobalAxios from 'axios';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

const axios = GlobalAxios.create();

/**
 * Arena 前端项目配置
 */
const ARENA_SCHEMA = {
    properties: {
        WEBSITE_PLAY_ROUTE: {
            type: 'string',
        },
        THIRD_PARTY_URL: {
            type: 'string',
        },
        CONTAINER_SCALING_FRAMESKIPS_THRESHOLD: {
            type: 'uint16',
        },
        PLATFORM_URL: {
            type: 'string',
        },
    },
    additionalProperties: true,
};

const BACKEND_SCHEMA = {
    properties: {
        NODE_ENV: { type: 'string' },
        DBHOST: { type: 'string' },
        DBPORT: { type: 'uint16' },
        DBUSER: { type: 'string' },
        DBPASSWORD: { type: 'string' },
        DBDATABASE: { type: 'string' },
        DBMAXLIMIT: { type: 'uint8' },
        SQL_LOGGER: { type: 'boolean' },
        DB2HOST: { type: 'string' },
        DB2PORT: { type: 'uint16' },
        DB2USER: { type: 'string' },
        DB2PASSWORD: { type: 'string' },
        DB2DATABASE: { type: 'string' },
        K8S: { type: 'boolean' },
        K8S_USER_NAMESPACE: { type: 'string' },
        K8S_IMAGE_PULL_SECRET_NAME: { type: 'string' },
        K8S_API_BASE_URL: { type: 'string' },
        K8S_API_CA: { type: 'string' },
        K8S_API_KEY: { type: 'string' },
        K8S_API_TOKEN: { type: 'string' },
        K8S_STORAGE_SERVER: { type: 'string' },
        K8S_STORAGE_PATH: { type: 'string' },
        K8S_STORAGE_MOUNT_PATH: { type: 'string' },
        CERT_NAME: { type: 'string' },
        IMAGE_REGISTRY: { type: 'string' },
        VM: { type: 'string' },
        EDIT_PLAYER_LIMIT: { type: 'uint8' },
        PLAY_PLAYER_LIMIT: { type: 'uint8' },
        ALI_AK_ID: { type: 'string' },
        ALI_AK_SECRET: { type: 'string' },
        AGORA_APP_ID: { type: 'string' },
        AGORA_CERTIFICATE: { type: 'string' },
        RABBITMQ_HOST_URL: { type: 'string' },
        JWT_SECRET: { type: 'string' },
    },
    additionalProperties: true,
};

const BUILD_SERVER_SCHEMA = {
    properties: {
        BUILD_CACHE_DBHOST: { type: 'string' },
        BUILD_CACHE_DBPORT: { type: 'uint16' },
        BUILD_CACHE_DBUSER: { type: 'string' },
        BUILD_CACHE_DBPASSWORD: { type: 'string' },
        BUILD_CACHE_DBDATABASE: { type: 'string' },
        POST_BODY_SIZE_LIMIT_BYTES: { type: 'uint32' },
    },
    additionalProperties: true,
};

const COMMON_SCHEMA = {
    properties: {
        APP_ENV: {
            enum: ['development', 'test', 'staging', 'preprod', 'production'],
        },
        APP_EDITION: {
            enum: ['createra', 'box3'],
        },
        APP_REGION: {
            enum: ['cn', 'oversea'],
        },
        AUTH_COOKIE_NAME: { type: 'string' },
        CDN_PATH: { type: 'string' },
        OSS_CDN_URL: { type: 'string' },
        CREATERA_BACKEND_SERVER_URL: { type: 'string' },
        INTRANET_CREATERA_BACKEND_SERVER_URL: { type: 'string' },
        MAAS_BACKEND_SERVER_URL: { type: 'string' },
        INTRANET_MAAS_BACKEND_SERVER_URL: { type: 'string' },
        JAVA_BACKEND_SERVER_URL: { type: 'string' },
        BACKEND_SERVER_URL: { type: 'string' },
        INTRANET_BACKEND_SERVER_URL: { type: 'string' },
        BOX_API_URL: { type: 'string' },
        INTRANET_BOX_API_URL: { type: 'string' },
        BACKEND_AUTH_CODE: { type: 'string' },
        ENGINE_APIS_URL: { type: 'string' },
        BUILD_SERVER_URL: { type: 'string' },
        ARENA_URL: { type: 'string' },
        WEBSITE_URL: { type: 'string' },
        HOME_URL: { type: 'string' },
        VOXA_URL: { type: 'string' },
        SENSORS_TRACKER_URL: { type: 'string' },
        // ERROR, WARN, INFO, DEBUG
        // 0      1     2     3
        LOG_LEVEL: { type: 'uint8' },
        CONTENT_SERVER_URL: { type: 'string' },
        MAX_CONTENT_SERVER_CONNECTIONS: { type: 'uint8' },
        REDIS_HOST: { type: 'string' },
        REDIS_PORT: { type: 'uint16' },
        REDIS_PASSWORD: { type: 'string' },
        REDIS_DB: { type: 'uint8' },
        REDIS_TLS: { type: 'boolean' },
        DBCONNECTIONLIMIT: { type: 'uint8' },
        PAID_ACCESS: { type: 'boolean' },
        SWEAR_KEY: { type: 'string' },
        DOMAIN_WHITELIST: {
            elements: {
                type: 'string',
            },
        },
        SCRIPT_WHITELIST: {
            elements: {
                type: 'string',
            },
        },
        DIFY_BASE_URL: { type: 'string' },
        DIFY_API_KEY: { type: 'string' },
        FAST_GPT_BASE_URL: { type: 'string' },
        FAST_GPT_API_KEY: { type: 'string' },
    },
    optionalProperties: {
        DEBUG: {
            type: 'string',
        },
        FEATURE_FLAGS: {
            elements: {
                type: 'string',
            },
        },
        MAX_HALF_CHUNKS: {
            type: 'uint8',
        },
        MAX_Y_HALF_CHUNKS: {
            type: 'uint8',
        },
    },
    additionalProperties: true,
};

const GAME_SERVER_SCHEMA = {
    properties: {
        AGORA_APP_ID: { type: 'string' },
        AGORA_CERTIFICATE: { type: 'string' },
        RABBITMQ_HOST_URL: { type: 'string' },
        STORAGE_CACHE_REDIS_DB: { type: 'uint8' },
        STORAGE_CACHE_REDIS_TTL: { type: 'uint8' },
        STORAGE_CACHE_REDIS_SENTINEL_HOST: {
            elements: {
                type: 'string',
            },
        },
        STORAGE_CACHE_REDIS_SENTINEL_PORT: { type: 'uint32' },
        STORAGE_CACHE_REDIS_SENTINEL_PASSWORD: { type: 'string' },
        INTRANET_STORAGE_BACKEND_SERVER_URL: { type: 'string' },
        OPENROUTER_API_KEY: { type: 'string' },
        AI_MODEL_MAPPING: {
            values: {
                elements: {
                    type: 'string',
                },
            },
        },
    },
    optionalProperties: {
        APP_ID: {
            type: 'string',
        },
        SCRIPT_TIMEOUT: { type: 'uint8' },
        SCRIPT_MEMORY_LIMIT: { type: 'uint8' },
    },
    additionalProperties: true,
};

const BOX_API_SCHEMA = {
    properties: {
        BOX_DATABASE_URL: { type: 'string' },
        USER_DATABASE_URL: { type: 'string' },
        ENGINE_DATABASE_URL: { type: 'string' },
        JWT_SECRET: { type: 'string' },
        JWT_EXPIRES_IN: { type: 'uint32' },
        CORS_ORIGINS: {
            elements: {
                type: 'string',
            },
        },
        GLOBAL_CLOUD_FUNCTION_URL: { type: 'string' },
        GLOBAL_CLOUD_FUNCTION_KEY: { type: 'string' },
        CREEM_API_KEY: { type: 'string' },
        CREEM_API_URL: { type: 'string' },
        CREEM_WEBHOOK_SECRET: { type: 'string' },
        OPENROUTER_API_KEY: { type: 'string' },
    },
};

const VOXA_SCHEMA = {
    optionalProperties: {
        VOXA: {
            type: 'string',
        },
    },
    additionalProperties: true,
};

const SCHEMA_MAP = {
    'common': COMMON_SCHEMA,
    'arena': ARENA_SCHEMA,
    'game-server': GAME_SERVER_SCHEMA,
    'backend': BACKEND_SCHEMA,
    'build-server': BUILD_SERVER_SCHEMA,
    'voxa': VOXA_SCHEMA,
    'box-api': BOX_API_SCHEMA,
};
const debug = defineDebug('@box-local/env');
const ajv = new Ajv();
/**
 * 注入 .env.local 文件到环境变量中（如果有的话
 * 如果 NODE_ENV 为 development 或 undefined，再注入 .env.development 作为默认开发配置
 * @returns 被注入的内容对象
 */
function initLocalEnv() {
    const localPath = join(process.cwd(), '.env.local');
    if (existsSync(localPath)) {
        config({ path: localPath });
    }
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
        config({
            path: join(process.cwd(), '.env.development'),
        });
    }
}
function initDebug(namespaces) {
    if (namespaces) {
        defineDebug.enable(namespaces);
        debug('Debug enabled: %s', namespaces);
    }
}
function initConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield createConfig();
        initDebug(result.DEBUG);
        return result;
    });
}
function createConfig(project, externalConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. 在公共入口层将 region 转换为 dataId
        const dataId = 'boxes';
        return createConfigWithSchema({ project, externalConfig, dataId });
    });
}
/**
 * 根据项目数组，从 Nacos 拉取并合并多个项目的配置。
 * 此方法会读取 common + 指定的 projects 配置，并进行合并和校验。
 * 不应在前端使用。
 */
function createConfigByProjects(_a) {
    return __awaiter(this, arguments, void 0, function* ({ projects, variant = 'default', externalConfig, }) {
        if (typeof window !== 'undefined') {
            throw new Error('Should not be used directly on client-side!');
        }
        // --- 复用 createConfigWithSchema 中的环境和 Nacos 连接设置 ---
        const { NEXT_PUBLIC_APP_ENV } = process.env;
        let nacosNS = process.env.NACOS_NAMESPACE;
        if (!NEXT_PUBLIC_APP_ENV || !nacosNS) {
            throw new Error(`App env and nacos namespace should not be empty! Got: APP_ENV:${NEXT_PUBLIC_APP_ENV}; Nacos Namespace:${nacosNS}`);
        }
        const nacosServers = process.env.NACOS_SERVER_ADDRESS.split(',');
        // --- 设置结束 ---
        // 并行获取所有配置
        const configPromises = [
            // 获取 common 配置
            fetchConfig(nacosServers, nacosNS, NEXT_PUBLIC_APP_ENV, 'common'),
            // 获取所有指定项目的专属配置
            ...projects.map((project) => fetchConfig(nacosServers, nacosNS, NEXT_PUBLIC_APP_ENV, project)),
        ];
        const rawConfigs = yield Promise.all(configPromises);
        // 解析并合并所有配置
        const commonConfig = parse(rawConfigs[0])[variant] || {};
        const projectConfigs = rawConfigs
            .slice(1)
            .map((raw) => parse(raw)[variant] || {})
            .reduce((acc, curr) => mergeDeepRight(acc, curr), {});
        let resultConfig = Object.assign(Object.assign(Object.assign({}, commonConfig), projectConfigs), {
            APP_ENV: NEXT_PUBLIC_APP_ENV,
        });
        if (externalConfig) {
            resultConfig = mergeDeepWith(defaultTo, resultConfig, externalConfig);
        }
        // 合并所有相关 schema 用于校验
        const combinedSchema = projects.reduce((acc, project) => {
            return mergeDeepRight(acc, SCHEMA_MAP[project]);
        }, COMMON_SCHEMA);
        debug('Validating combined project config.');
        const result = validateWithSchema(resultConfig, combinedSchema);
        debug('Validating combined project config finished.');
        return result;
    });
}
function createConfigWithSchema(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const { project, externalConfig, dataId } = args;
        if (typeof window !== 'undefined') {
            throw new Error('Should not be used directly on client-side!');
        }
        const localConfigPath = process.env.BOX_LOCAL_CONFIG_PATH;
        if (localConfigPath) {
            const configData = parse(readFileSync(localConfigPath, 'utf8'));
            const projectResult = project ? configData[project] : undefined;
            let resultConfig = Object.assign(Object.assign({}, configData.common), projectResult);
            if (externalConfig) {
                resultConfig = mergeDeepWith(defaultTo, resultConfig, externalConfig);
            }
            debug('Validating local config from %s.', localConfigPath);
            return validateWithSchema(resultConfig, project
                ? mergeDeepRight(COMMON_SCHEMA, SCHEMA_MAP[project])
                : COMMON_SCHEMA);
        }
        const { NEXT_PUBLIC_APP_ENV } = process.env; // APP_ENV 在 staging 和 production 环境不一致，不能取 Build Time 的值
        const APP_EDITION = process.env.NEXT_PUBLIC_APP_EDITION;
        // 从2023年5月开始，国内也要有createra业务了，所以又又增加了个新字段，用来区分国内外
        const APP_REGION = process.env.NEXT_PUBLIC_APP_REGION;
        let nacosNS = process.env.NACOS_NAMESPACE;
        if (!NEXT_PUBLIC_APP_ENV || !APP_EDITION || !APP_REGION) {
            throw new Error(`App env, edition and region should not be empty! Got: APP_ENV:${NEXT_PUBLIC_APP_ENV}; APP_EDITION:${APP_EDITION}; APP_REGION: ${APP_REGION}`);
        }
        if (!nacosNS) {
            const STAGING_NAMESPACE_MAP = {
                createra: '9781fc14-2fcd-4b32-a8e1-0e235cc8d675',
                box3: '9b0268e6-dec1-4db3-9d60-7cfd46ad82d1',
            };
            nacosNS = STAGING_NAMESPACE_MAP[APP_EDITION];
        }
        const nacosServers = process.env.NACOS_SERVER_ADDRESS.split(',');
        // 3. 直接将 dataId 传递给 fetchConfig
        const rawConfig = yield fetchConfig(nacosServers, nacosNS, NEXT_PUBLIC_APP_ENV, dataId);
        let configData = parse(rawConfig);
        const projectResult = project ? configData[project] : undefined;
        let resultConfig = Object.assign(Object.assign(Object.assign({}, configData['common']), projectResult), {
            APP_ENV: NEXT_PUBLIC_APP_ENV,
            APP_EDITION,
            APP_REGION,
        });
        if (externalConfig) {
            resultConfig = mergeDeepWith(defaultTo, resultConfig, externalConfig);
        }
        debug('Validating project config.');
        const result = validateWithSchema(resultConfig, project
            ? mergeDeepRight(COMMON_SCHEMA, SCHEMA_MAP[project])
            : COMMON_SCHEMA);
        debug('Validating project config finished.');
        return result;
    });
}
function validateWithSchema(data, schema) {
    if (!ajv.validate(schema, data)) {
        throw new Error('Config validation failed!\n' +
            JSON.stringify(ajv.errors, undefined, '\t'));
    }
    return data;
}
function fetchConfig(servers, namespace, group, 
/**
 * @param dataId - 现在是必需的参数，职责更纯粹
 */
dataId) {
    return __awaiter(this, void 0, void 0, function* () {
        const nacosServerSize = servers.length;
        let index = Math.floor(Math.random() * nacosServerSize);
        for (let i = 0; i < nacosServerSize; ++i) {
            const baseUrl = getBaseUrl(servers[index]);
            try {
                debug('Fetching nacos config: %s, dataId: %s, group: %s', baseUrl, dataId, group);
                // 4. 直接使用传入的 dataId
                const response = yield axios.get(`${baseUrl}/cs/configs?tenant=${namespace}&group=${group}&dataId=${dataId}`);
                debug('Fetching nacos config finished.', baseUrl);
                return response.data;
            }
            catch (err) {
                debug('Fetch nacos config error: %O. Try next nacos server...', err);
                index = (index + 1) % nacosServerSize;
            }
        }
        throw new Error(`Failed to read config after tried all servers: ${servers}`);
    });
}
function getBaseUrl(nacosServer) {
    const protocol = nacosServer.startsWith('http') ? '' : 'http://';
    return `${protocol}${nacosServer}/nacos/v1`;
}

export { createConfig, createConfigByProjects, initConfig, initDebug, initLocalEnv };
//# sourceMappingURL=index.es.js.map
