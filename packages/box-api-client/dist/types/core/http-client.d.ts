/**
 * API 响应包装类型
 * 所有 box-api 的响应都通过 TransformInterceptor 进行包装
 */
export interface ApiResponse<T> {
    /**
     * 实际的响应数据
     */
    data: T;
    /**
     * 服务器响应时间戳 (ISO 8601 格式)
     */
    timestamp: string;
}
/**
 * API 客户端错误类
 * 用于包装 HTTP 请求过程中发生的所有类型的错误
 */
export declare class ApiError extends Error {
    /**
     * HTTP 状态码 (如果有响应的话)
     */
    readonly statusCode?: number;
    /**
     * 原始响应对象 (如果有的话)
     */
    readonly response?: Response;
    /**
     * 服务器返回的错误数据 (如果有的话)
     */
    readonly data?: unknown;
    constructor(message: string, options?: {
        statusCode?: number;
        response?: Response;
        data?: unknown;
        cause?: Error;
    });
}
/**
 * 网络请求错误
 * 用于区分网络错误和 HTTP 错误
 */
export declare class NetworkError extends ApiError {
    constructor(message: string, cause?: Error);
}
/**
 * HTTP 请求选项
 */
export interface FetchRequestOptions extends Omit<RequestInit, 'body'> {
    /**
     * 请求体 (如果需要的话)
     */
    body?: any;
    /**
     * 请求超时时间 (毫秒)
     * 默认值: 30000
     */
    timeout?: number;
    /**
     * 是否自动转换响应为 JSON
     * 默认值: true
     */
    parseJson?: boolean;
    /**
     * 自定义错误处理器
     */
    onError?: (error: ApiError) => void;
    /**
     * URL 查询参数
     */
    params?: Record<string, string | number | boolean | undefined>;
}
/**
 * HTTP 响应数据
 */
export interface FetchResponse<T = unknown> {
    /**
     * HTTP 状态码
     */
    status: number;
    /**
     * 响应头
     */
    headers: Headers;
    /**
     * 响应体
     */
    data: T;
}
/**
 * 基础 HTTP 客户端
 * 提供了 fetch 的便捷包装，支持类型安全、错误处理和超时控制
 */
export declare class HttpClient {
    private readonly baseUrl;
    private readonly defaultTimeout;
    private readonly defaultHeaders;
    constructor(options: {
        baseUrl: string;
        timeout?: number;
        headers?: Record<string, string>;
    });
    /**
     * 设置默认请求头
     */
    setDefaultHeaders(headers: Record<string, string>): void;
    /**
     * 设置 Cookie 请求头
     * 采用合并方式，不会覆盖其他已设置的请求头
     */
    setCookie(cookieString: string): void;
    /**
     * 执行 GET 请求
     * 自动解包 ApiResponse，直接返回数据
     */
    get<T = unknown>(path: string, options?: FetchRequestOptions): Promise<T>;
    /**
     * 执行 POST 请求
     * 自动解包 ApiResponse，直接返回数据
     */
    post<T = unknown>(path: string, body?: any, options?: FetchRequestOptions): Promise<T>;
    /**
     * 执行 PUT 请求
     * 自动解包 ApiResponse，直接返回数据
     */
    put<T = unknown>(path: string, body?: any, options?: FetchRequestOptions): Promise<T>;
    /**
     * 执行 PATCH 请求
     * 自动解包 ApiResponse，直接返回数据
     */
    patch<T = unknown>(path: string, body?: any, options?: FetchRequestOptions): Promise<T>;
    /**
     * 执行 DELETE 请求
     * 自动解包 ApiResponse，直接返回数据
     */
    delete<T = unknown>(path: string, options?: FetchRequestOptions): Promise<T>;
    /**
     * 通用请求方法，所有 HTTP 方法最终都调用此方法
     */
    request<T = unknown>(path: string, options?: FetchRequestOptions): Promise<FetchResponse<T>>;
    /**
     * 构建完整的请求 URL
     */
    private buildUrl;
    /**
     * 构建请求头，合并默认头和自定义头
     * 注意: 认证令牌通过 Cookie 自动发送，不需要手动管理
     */
    private buildHeaders;
    /**
     * 序列化请求体
     */
    private serializeBody;
    /**
     * 解析响应
     */
    private parseResponse;
    /**
     * 处理错误响应
     */
    private handleErrorResponse;
    /**
     * 获取适当的错误消息
     */
    private getErrorMessage;
    /**
     * 创建带超时的 AbortSignal
     */
    private createAbortSignal;
}
//# sourceMappingURL=http-client.d.ts.map