"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = exports.NetworkError = exports.ApiError = void 0;
/**
 * API 客户端错误类
 * 用于包装 HTTP 请求过程中发生的所有类型的错误
 */
class ApiError extends Error {
    constructor(message, options) {
        super(message);
        /**
         * HTTP 状态码 (如果有响应的话)
         */
        Object.defineProperty(this, "statusCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * 原始响应对象 (如果有的话)
         */
        Object.defineProperty(this, "response", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * 服务器返回的错误数据 (如果有的话)
         */
        Object.defineProperty(this, "data", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = 'ApiError';
        this.statusCode = options === null || options === void 0 ? void 0 : options.statusCode;
        this.response = options === null || options === void 0 ? void 0 : options.response;
        this.data = options === null || options === void 0 ? void 0 : options.data;
        // 设置错误链
        if (options === null || options === void 0 ? void 0 : options.cause) {
            this.cause = options.cause;
        }
        // 保持原型链
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}
exports.ApiError = ApiError;
/**
 * 网络请求错误
 * 用于区分网络错误和 HTTP 错误
 */
class NetworkError extends ApiError {
    constructor(message, cause) {
        super(message, { cause });
        this.name = 'NetworkError';
        Object.setPrototypeOf(this, NetworkError.prototype);
    }
}
exports.NetworkError = NetworkError;
/**
 * 基础 HTTP 客户端
 * 提供了 fetch 的便捷包装，支持类型安全、错误处理和超时控制
 */
class HttpClient {
    constructor(options) {
        Object.defineProperty(this, "baseUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "defaultTimeout", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "defaultHeaders", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.baseUrl = options.baseUrl;
        this.defaultTimeout = options.timeout || 30000;
        this.defaultHeaders = options.headers || {};
    }
    /**
     * 设置默认请求头
     */
    setDefaultHeaders(headers) {
        Object.assign(this.defaultHeaders, headers);
    }
    /**
     * 设置 Cookie 请求头
     * 采用合并方式，不会覆盖其他已设置的请求头
     */
    setCookie(cookieString) {
        this.defaultHeaders['Cookie'] = cookieString;
    }
    /**
     * 执行 GET 请求
     * 自动解包 ApiResponse，直接返回数据
     */
    get(path, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.request(path, Object.assign(Object.assign({}, options), { method: 'GET' }));
            return response.data.data;
        });
    }
    /**
     * 执行 POST 请求
     * 自动解包 ApiResponse，直接返回数据
     */
    post(path, body, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.request(path, Object.assign(Object.assign({}, options), { method: 'POST', body }));
            return response.data.data;
        });
    }
    /**
     * 执行 PUT 请求
     * 自动解包 ApiResponse，直接返回数据
     */
    put(path, body, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.request(path, Object.assign(Object.assign({}, options), { method: 'PUT', body }));
            return response.data.data;
        });
    }
    /**
     * 执行 PATCH 请求
     * 自动解包 ApiResponse，直接返回数据
     */
    patch(path, body, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.request(path, Object.assign(Object.assign({}, options), { method: 'PATCH', body }));
            return response.data.data;
        });
    }
    /**
     * 执行 DELETE 请求
     * 自动解包 ApiResponse，直接返回数据
     */
    delete(path, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.request(path, Object.assign(Object.assign({}, options), { method: 'DELETE' }));
            return response.data.data;
        });
    }
    /**
     * 通用请求方法，所有 HTTP 方法最终都调用此方法
     */
    request(path, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const _a = options || {}, { body, timeout = this.defaultTimeout, parseJson = true, onError, params } = _a, fetchOptions = __rest(_a, ["body", "timeout", "parseJson", "onError", "params"]);
            const url = this.buildUrl(path, params);
            const headers = this.buildHeaders(fetchOptions.headers);
            const signal = this.createAbortSignal(timeout);
            try {
                const response = yield fetch(url, Object.assign(Object.assign({}, fetchOptions), { headers,
                    signal, credentials: 'include', body: this.serializeBody(body) }));
                if (!response.ok) {
                    const error = yield this.handleErrorResponse(response, parseJson);
                    onError === null || onError === void 0 ? void 0 : onError(error);
                    throw error;
                }
                const data = yield this.parseResponse(response, parseJson);
                return {
                    status: response.status,
                    headers: response.headers,
                    data,
                };
            }
            catch (error) {
                if (error instanceof ApiError) {
                    throw error;
                }
                if (error instanceof DOMException && error.name === 'AbortError') {
                    const timeoutError = new ApiError(`Request timeout after ${timeout}ms`);
                    onError === null || onError === void 0 ? void 0 : onError(timeoutError);
                    throw timeoutError;
                }
                if (error instanceof TypeError) {
                    const networkError = new NetworkError(`Network error: ${error.message}`, error);
                    onError === null || onError === void 0 ? void 0 : onError(networkError);
                    throw networkError;
                }
                throw error;
            }
        });
    }
    /**
     * 构建完整的请求 URL
     */
    buildUrl(path, params) {
        let url;
        // 如果 path 已经是完整 URL，直接返回
        if (path.startsWith('http://') || path.startsWith('https://')) {
            url = path;
        }
        else {
            // 移除路径开头的斜杠，避免双斜杠
            const normalizedPath = path.startsWith('/') ? path : `/${path}`;
            url = `${this.baseUrl}${normalizedPath}`;
        }
        if (params) {
            const searchParams = new URLSearchParams();
            Object.keys(params).forEach((key) => {
                const value = params[key];
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                url += (url.includes('?') ? '&' : '?') + queryString;
            }
        }
        return url;
    }
    /**
     * 构建请求头，合并默认头和自定义头
     * 注意: 认证令牌通过 Cookie 自动发送，不需要手动管理
     */
    buildHeaders(customHeaders) {
        const headers = new Headers(this.defaultHeaders);
        // 添加 Content-Type 默认值
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        // 合并自定义头
        if (customHeaders) {
            const custom = new Headers(customHeaders);
            custom.forEach((value, key) => {
                headers.set(key, value);
            });
        }
        return headers;
    }
    /**
     * 序列化请求体
     */
    serializeBody(body) {
        if (!body)
            return undefined;
        if (typeof body === 'string') {
            return body;
        }
        return JSON.stringify(body);
    }
    /**
     * 解析响应
     */
    parseResponse(response, parseJson) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!parseJson) {
                return response;
            }
            const contentType = response.headers.get('content-type');
            if (!(contentType === null || contentType === void 0 ? void 0 : contentType.includes('application/json'))) {
                return response;
            }
            try {
                return yield response.json();
            }
            catch (error) {
                throw new ApiError('Failed to parse JSON response', {
                    statusCode: response.status,
                    response,
                    cause: error,
                });
            }
        });
    }
    /**
     * 处理错误响应
     */
    handleErrorResponse(response, parseJson) {
        return __awaiter(this, void 0, void 0, function* () {
            let data = null;
            try {
                data = yield this.parseResponse(response, parseJson);
            }
            catch (_a) {
                // 忽略响应解析错误
            }
            const message = this.getErrorMessage(response, data);
            return new ApiError(message, {
                statusCode: response.status,
                response,
                data,
            });
        });
    }
    /**
     * 获取适当的错误消息
     */
    getErrorMessage(response, data) {
        // 尝试从响应数据中获取错误消息
        if (typeof data === 'object' && data !== null) {
            const dataObj = data;
            if (typeof dataObj.message === 'string') {
                return dataObj.message;
            }
            if (typeof dataObj.error === 'string') {
                return dataObj.error;
            }
        }
        // 使用 HTTP 状态文本
        return `HTTP ${response.status}: ${response.statusText}`;
    }
    /**
     * 创建带超时的 AbortSignal
     */
    createAbortSignal(timeout) {
        const controller = new AbortController();
        if (timeout > 0) {
            setTimeout(() => controller.abort(), timeout);
        }
        return controller.signal;
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=http-client.js.map