import type { AxiosRequestConfig } from 'axios';
import MD5 from 'crypto-js/md5';
import SHA256 from 'crypto-js/sha256';
import type { RequestParams } from '../interface';

/**
 * 生成签名（sha256 + md5）
 * 算法与旧平台客户端保持兼容。
 * @params 签名的参数字典
 * @secretKey 秘钥
 */
export function getSignature(params: Record<string, any>, secretKey: string) {
  const timestamp = new Date().getTime();

  const dict: Record<string, any> = { ...params, timestamp };

  // 将参数名按照ASCII码从小到大（A～Z）排序
  const keyList = Object.keys(dict).sort();

  // 按顺序拼接key=value
  const keyValueList = keyList.reduce<string[]>((list, key) => {
    const val = dict[key];

    // undefined，null，空字符串不参与校验
    if (![undefined, null, ''].includes(val)) {
      if (Array.isArray(val)) {
        list.push(`${key}=${val.length}`);
      } else if (typeof val === 'object') {
        list.push(`${key}=json-obj`);
      } else {
        list.push(`${key}=${val}`);
      }
    }

    return list;
  }, []);

  // 拼接secretKey的md5
  keyValueList.push(`key=${MD5(secretKey).toString()}`);

  // 连接所有参数，进行md5加密
  const md5Value = MD5(keyValueList.join('&')).toString();

  // 再进行sha256加密，全大写
  const hash = SHA256(md5Value).toString().toUpperCase();

  return { hash, timestamp };
}

/**
 * 生成用于签名（sha256 + md5）的请求拦截器。
 * 算法与旧平台客户端保持兼容。
 * @param out 会被更新headers字段，如果没有headers，会添加headers字段
 * @param requestData 请求的数据。params是query参数，data是body参数。
 * @param secretKey 秘钥
 */
export function appendSignatureHeaders<T extends RequestParams>(
  out: T,
  requestData: Pick<AxiosRequestConfig, 'params' | 'data'>,
  secretKey: string,
): T {
  const { params, data } = requestData;

  /**
   * 按照平台的代码逻辑，优先判断了data的类型，处理成某种字典结构，再进行签名
   * - 如果是数组，生成一个 { array: data } 结构
   * - 如果是字符串、数组，生成一个 { body: data } 结构
   * - 其余情况，与params合并成一个字典对象，理论上不会有接口同时存在params和data参数。后端的说法是为了通用以防万一。
   */
  let signatureParams: Record<string, any>;

  if (Array.isArray(data)) {
    signatureParams = { array: data };
  } else if (['number', 'string'].includes(typeof data)) {
    signatureParams = { body: data };
  } else {
    signatureParams = { ...params, ...data };
  }

  const signature = getSignature(signatureParams, secretKey);

  if (out.headers) {
    Object.assign(out.headers, signature);
  } else {
    out.headers = signature;
  }

  return out;
}
