import type { AxiosRequestConfig } from 'axios';
export declare enum ContentType {
    Json = "application/json",
    FormData = "multipart/form-data",
    UrlEncoded = "application/x-www-form-urlencoded"
}
export type Request = <T extends any, _E = any>({ path, type, query, body, ...requestParams }: FullRequestParams) => Promise<T extends TRes<any> ? T['data'] : void>;
export type QueryParamsType = Record<string | number, any>;
export interface FullRequestParams extends Omit<AxiosRequestConfig, 'data' | 'params' | 'url' | 'responseType'> {
    /** request path */
    path: string;
    /** content type of request body */
    type?: ContentType;
    /** query params */
    query?: QueryParamsType;
    /** request body */
    body?: unknown;
}
export type RequestParams = Omit<FullRequestParams, 'body' | 'method' | 'query' | 'path'>;
export interface TRes<T> {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: T;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
//# sourceMappingURL=interface.d.ts.map