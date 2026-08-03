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
export class ApiError extends Error {
  /**
   * HTTP 状态码 (如果有响应的话)
   */
  public readonly statusCode?: number;

  /**
   * 原始响应对象 (如果有的话)
   */
  public readonly response?: Response;

  /**
   * 服务器返回的错误数据 (如果有的话)
   */
  public readonly data?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      response?: Response;
      data?: unknown;
      cause?: Error;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = options?.statusCode;
    this.response = options?.response;
    this.data = options?.data;

    // 设置错误链
    if (options?.cause) {
      (this as any).cause = options.cause;
    }

    // 保持原型链
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * 网络请求错误
 * 用于区分网络错误和 HTTP 错误
 */
export class NetworkError extends ApiError {
  constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
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
export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultTimeout: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: {
    baseUrl: string;
    timeout?: number;
    headers?: Record<string, string>;
  }) {
    this.baseUrl = options.baseUrl;
    this.defaultTimeout = options.timeout || 30000;
    this.defaultHeaders = options.headers || {};
  }

  /**
   * 设置默认请求头
   */
  public setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.defaultHeaders, headers);
  }

  /**
   * 设置 Cookie 请求头
   * 采用合并方式，不会覆盖其他已设置的请求头
   */
  public setCookie(cookieString: string): void {
    this.defaultHeaders['Cookie'] = cookieString;
  }

  /**
   * 执行 GET 请求
   * 自动解包 ApiResponse，直接返回数据
   */
  public async get<T = unknown>(
    path: string,
    options?: FetchRequestOptions,
  ): Promise<T> {
    const response = await this.request<ApiResponse<T>>(path, {
      ...options,
      method: 'GET',
    });
    return response.data.data;
  }

  /**
   * 执行 POST 请求
   * 自动解包 ApiResponse，直接返回数据
   */
  public async post<T = unknown>(
    path: string,
    body?: any,
    options?: FetchRequestOptions,
  ): Promise<T> {
    const response = await this.request<ApiResponse<T>>(path, {
      ...options,
      method: 'POST',
      body,
    });
    return response.data.data;
  }

  /**
   * 执行 PUT 请求
   * 自动解包 ApiResponse，直接返回数据
   */
  public async put<T = unknown>(
    path: string,
    body?: any,
    options?: FetchRequestOptions,
  ): Promise<T> {
    const response = await this.request<ApiResponse<T>>(path, {
      ...options,
      method: 'PUT',
      body,
    });
    return response.data.data;
  }

  /**
   * 执行 PATCH 请求
   * 自动解包 ApiResponse，直接返回数据
   */
  public async patch<T = unknown>(
    path: string,
    body?: any,
    options?: FetchRequestOptions,
  ): Promise<T> {
    const response = await this.request<ApiResponse<T>>(path, {
      ...options,
      method: 'PATCH',
      body,
    });
    return response.data.data;
  }

  /**
   * 执行 DELETE 请求
   * 自动解包 ApiResponse，直接返回数据
   */
  public async delete<T = unknown>(
    path: string,
    options?: FetchRequestOptions,
  ): Promise<T> {
    const response = await this.request<ApiResponse<T>>(path, {
      ...options,
      method: 'DELETE',
    });
    return response.data.data;
  }

  /**
   * 通用请求方法，所有 HTTP 方法最终都调用此方法
   */
  public async request<T = unknown>(
    path: string,
    options?: FetchRequestOptions,
  ): Promise<FetchResponse<T>> {
    const {
      body,
      timeout = this.defaultTimeout,
      parseJson = true,
      onError,
      params,
      ...fetchOptions
    } = options || {};

    const url = this.buildUrl(path, params);
    const headers = this.buildHeaders(fetchOptions.headers);
    const signal = this.createAbortSignal(timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal,
        credentials: 'include', // 自动发送和接收 cookies
        body: this.serializeBody(body),
      });

      if (!response.ok) {
        const error = await this.handleErrorResponse(response, parseJson);
        onError?.(error);
        throw error;
      }

      const data = await this.parseResponse<T>(response, parseJson);

      return {
        status: response.status,
        headers: response.headers,
        data,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError = new ApiError(`Request timeout after ${timeout}ms`);
        onError?.(timeoutError);
        throw timeoutError;
      }

      if (error instanceof TypeError) {
        const networkError = new NetworkError(
          `Network error: ${error.message}`,
          error,
        );
        onError?.(networkError);
        throw networkError;
      }

      throw error;
    }
  }

  /**
   * 构建完整的请求 URL
   */
  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    let url: string;

    // 如果 path 已经是完整 URL，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
      url = path;
    } else {
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
  private buildHeaders(customHeaders?: HeadersInit): Headers {
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
  private serializeBody(body?: any): string | undefined {
    if (!body) return undefined;

    if (typeof body === 'string') {
      return body;
    }

    return JSON.stringify(body);
  }

  /**
   * 解析响应
   */
  private async parseResponse<T>(
    response: Response,
    parseJson: boolean,
  ): Promise<T> {
    if (!parseJson) {
      return response as unknown as T;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return response as unknown as T;
    }

    try {
      return await response.json();
    } catch (error) {
      throw new ApiError('Failed to parse JSON response', {
        statusCode: response.status,
        response,
        cause: error as Error,
      });
    }
  }

  /**
   * 处理错误响应
   */
  private async handleErrorResponse(
    response: Response,
    parseJson: boolean,
  ): Promise<ApiError> {
    let data: unknown = null;

    try {
      data = await this.parseResponse(response, parseJson);
    } catch {
      // 忽略响应解析错误
    }

    const message = this.getErrorMessage(response, data);

    return new ApiError(message, {
      statusCode: response.status,
      response,
      data,
    });
  }

  /**
   * 获取适当的错误消息
   */
  private getErrorMessage(response: Response, data: unknown): string {
    // 尝试从响应数据中获取错误消息
    if (typeof data === 'object' && data !== null) {
      const dataObj = data as Record<string, unknown>;
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
  private createAbortSignal(timeout: number): AbortSignal {
    const controller = new AbortController();

    if (timeout > 0) {
      setTimeout(() => controller.abort(), timeout);
    }

    return controller.signal;
  }
}
