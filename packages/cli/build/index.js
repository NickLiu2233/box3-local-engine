"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREATOR_SCRIPT_MAX_BYTES = exports.CREATOR_SCRIPT_SIDES = exports.FULL_CREATOR_CAPABILITIES = exports.CREATOR_CAPABILITY_META = exports.CREATOR_CAPABILITIES = exports.CREATOR_API_PREFIX = exports.CREATOR_API_VERSION = void 0;
exports.normalizeCreatorCapabilities = normalizeCreatorCapabilities;
exports.hasCreatorCapability = hasCreatorCapability;
exports.creatorApiPath = creatorApiPath;
exports.creatorProjectScriptPath = creatorProjectScriptPath;
exports.parseCreatorProjectScriptWrite = parseCreatorProjectScriptWrite;
exports.writeCreatorProjectScript = writeCreatorProjectScript;
/**
 * Stable protocol surface shared by CLI clients and Creator HTTP adapters.
 * This module deliberately contains no HTTP, credential or storage code:
 * those are adapters owned by the calling application.
 */
exports.CREATOR_API_VERSION = 'v1';
exports.CREATOR_API_PREFIX = `/api/creator/${exports.CREATOR_API_VERSION}`;
exports.CREATOR_CAPABILITIES = [
    'projects.view',
    'projects.create',
    'projects.edit',
    'projects.delete',
    'projects.import',
    'projects.export',
    'models.manage',
];
exports.CREATOR_CAPABILITY_META = Object.freeze({
    'projects.view': { label: '查看地图', description: '进入创作端并查看地图列表' },
    'projects.create': { label: '新建地图', description: '创建主地图和副地图' },
    'projects.edit': { label: '编辑地图', description: '修改地图资料、内容和运行配置' },
    'projects.delete': { label: '删除地图', description: '删除地图或地图组，不可恢复' },
    'projects.import': { label: '导入工程', description: '导入创作工程和副地图' },
    'projects.export': { label: '导出工程', description: '导出创作工程或游玩包' },
    'models.manage': { label: '管理模型', description: '导入、修改和导出 VOXA 模型工程' },
});
exports.FULL_CREATOR_CAPABILITIES = [...exports.CREATOR_CAPABILITIES];
exports.CREATOR_SCRIPT_SIDES = ['client', 'server'];
exports.CREATOR_SCRIPT_MAX_BYTES = 20 * 1024 * 1024;
function protocolError(code, message, status = 422) {
    return Object.assign(new Error(message), { code, status });
}
function recordOf(value) {
    return value && typeof value === 'object' ? value : {};
}
function normalizeCreatorCapabilities(value) {
    if (!Array.isArray(value))
        return [];
    const allowed = new Set(exports.CREATOR_CAPABILITIES);
    return [...new Set(value.map(String).filter((capability) => allowed.has(capability)))];
}
function hasCreatorCapability(permissions, capability) {
    return capability === 'projects.view' || normalizeCreatorCapabilities(permissions).includes(capability);
}
function creatorApiPath(...segments) {
    return [exports.CREATOR_API_PREFIX, ...segments.map((segment) => encodeURIComponent(String(segment)))].join('/');
}
function creatorProjectScriptPath(projectId, side, entry) {
    const input = parseCreatorProjectScriptWrite({ projectId, side, entry, content: '' });
    return creatorApiPath('projects', input.projectId, 'scripts', input.side, input.entry);
}
function parseCreatorProjectScriptWrite(value) {
    const input = recordOf(value);
    const projectId = typeof input.projectId === 'string' ? input.projectId.trim() : '';
    const side = typeof input.side === 'string' ? input.side : '';
    const entry = typeof input.entry === 'string' ? input.entry : '';
    const content = input.content;
    if (!projectId)
        throw protocolError('PROJECT_ID_REQUIRED', 'projectId 必须是非空字符串');
    if (!exports.CREATOR_SCRIPT_SIDES.includes(side)) {
        throw protocolError('SCRIPT_SIDE_INVALID', 'side 必须是 client 或 server');
    }
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(entry) || entry.includes('..')) {
        throw protocolError('SCRIPT_ENTRY_INVALID', 'entry 必须是有效的脚本文件名');
    }
    if (typeof content !== 'string') {
        throw protocolError('SCRIPT_CONTENT_REQUIRED', 'content 必须是字符串');
    }
    if (Buffer.byteLength(content, 'utf8') > exports.CREATOR_SCRIPT_MAX_BYTES) {
        throw protocolError('SCRIPT_CONTENT_TOO_LARGE', '脚本内容不能超过 20 MiB');
    }
    return { projectId, side: side, entry, content };
}
function writeCreatorProjectScript(store, input) {
    if (!store || typeof store.updateProjectScript !== 'function') {
        throw new TypeError('CreatorProjectScriptStore 必须提供 updateProjectScript');
    }
    return store.updateProjectScript(input.projectId, input.side, input.entry, input.content);
}
