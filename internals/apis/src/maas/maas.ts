import {
  FrontEndDataFormatBoolean,
  PageResponseMapResp,
  ResPageResponseSimpleUserInfoVO,
} from '../data-contracts';
import { HttpClient } from '../http-client';
import { ContentType, RequestParams } from '../interface';

export class Maas<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags 用于签发第三方登录token
   * @name setCookieWithToken
   * @summary 利用签发给第三方登录的token来设置cookie
   * @request GET:/user/auth2Cookie
   */
  public setCookieWithToken = (query: { token: string }) =>
    this.request<ResPageResponseSimpleUserInfoVO, void>({
      path: '/user/auth2Cookie',
      method: 'GET',
      query,
      type: ContentType.Json,
    });
  /**
   * No description
   *
   * @tags 用于自动审核发布作品
   * @name autoReviewPublish
   * @summary 自动审核发布作品
   * @request POST:/map/auto-review
   */
  public autoReviewPublish = (query: { contentId: string }) =>
    this.request<ResPageResponseSimpleUserInfoVO, void>({
      path: '/map/auto-review',
      method: 'POST',
      query,
      type: ContentType.Json,
    });
  /**
   * No description
   *
   * @tags 复制地图
   * @name copyMap
   * @summary 复制地图
   * @request POST:/map/copy
   */
  public mapCopyUsingPost = (query: { contentId: string; name: string }) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: '/map/copy',
      method: 'POST',
      query,
      type: ContentType.Json,
    });
  /**
   * No description
   *
   * @tags 查询地图
   * @name getMapByPage
   * @summary 查询地图
   * @request GET:/map/page
   */
  public mapPageUsingGet = (
    query: { limit: number; offset: number },
    params: RequestParams = {},
  ) =>
    this.request<PageResponseMapResp, void>({
      path: '/map/page',
      method: 'GET',
      query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 删除地图
   * @name deleteMap
   * @summary 删除地图
   * @request DELETE:/map/contentId
   */
  public mapDeleteUsingDelete = (
    query: { contentId: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: '/map/del',
      method: 'DELETE',
      query,
      ...params,
    });
}
