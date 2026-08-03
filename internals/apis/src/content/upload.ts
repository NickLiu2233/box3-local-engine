/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import { ResString } from '../data-contracts';
import { HttpClient } from '../http-client';
import { ContentType, RequestParams } from '../interface';

export class Upload<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * 上传文件接口
   * @param data
   * @param params
   * @returns
   */
  fileUploadPost = (
    data: { file?: Blob; type?: 'model' | 'script' },
    params: RequestParams = {},
  ) => {
    const formData = new FormData();
    const { file, type } = data;
    if (file) {
      formData.append('file', file);
    }
    if (type) {
      formData.append('type', type);
    }

    return this.request<ResString, void>({
      path: `/file-upload-auth`,
      method: 'POST',
      body: formData,
      type: ContentType.FormData,
      ...params,
    });
  };
}
