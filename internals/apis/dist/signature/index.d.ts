import type { AxiosRequestConfig } from 'axios';
import type { RequestParams } from '../interface';
/**
 * 生成签名（sha256 + md5）
 * 算法与旧平台客户端保持兼容。
 * @params 签名的参数字典
 * @secretKey 秘钥
 */
export declare function getSignature(params: Record<string, any>, secretKey: string): {
    hash: string;
    timestamp: number;
};
/**
 * 生成用于签名（sha256 + md5）的请求拦截器。
 * 算法与旧平台客户端保持兼容。
 * @param out 会被更新headers字段，如果没有headers，会添加headers字段
 * @param requestData 请求的数据。params是query参数，data是body参数。
 * @param secretKey 秘钥
 */
export declare function appendSignatureHeaders<T extends RequestParams>(out: T, requestData: Pick<AxiosRequestConfig, 'params' | 'data'>, secretKey: string): T;
//# sourceMappingURL=index.d.ts.map