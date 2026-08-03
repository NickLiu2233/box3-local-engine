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

import {
  AuthSendCodeParam,
  CodemaoLoginParam,
  EmailUpdateParam,
  FingerprintCheckParam,
  FirebaseLoginParam,
  LoginParam,
  OauthCallBackParam,
  OauthLoginParam,
  PhoneLoginParam,
  PhoneUpdateParam,
  PwdUpdateParam,
  RegisterParam,
  ResLoginUserInfoVO,
  ResOauthRedirectVO,
  ResSingleValueVOBoolean,
  ResSingleValueVOString,
  VerifyResetPwdParam,
} from '../data-contracts';
import { HttpClient } from '../http-client';
import { ContentType, RequestParams } from '../interface';

export class JavaAuth<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags 权限
   * @name GetAuthHashUsingGet
   * @summary 权限-获取token
   * @request GET:/auth/auth/{type}
   */
  getAuthHashUsingGet = (type?: string, params: RequestParams = {}) =>
    this.request<ResSingleValueVOString, void>({
      path: `/auth/auth/${type}`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name BindCodemaoUsingPost
   * @summary 权限-编程猫账号绑定(前提是已经进行codemao账号登录)
   * @request POST:/auth/bind/codemao
   */
  bindCodemaoUsingPost = (
    codemaoLoginParam: CodemaoLoginParam,
    params: RequestParams = {},
  ) =>
    this.request<ResLoginUserInfoVO, void>({
      path: `/auth/bind/codemao`,
      method: 'POST',
      body: codemaoLoginParam,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name CheckBlackUsingPost
   * @summary 权限-Ip与游客黑名单校验
   * @request POST:/auth/check-black
   */
  checkBlackUsingPost = (
    param: FingerprintCheckParam,
    params: RequestParams = {},
  ) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/auth/check-black`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name UpdateEmailUsingPatch
   * @summary 权限-修改绑定邮箱
   * @request PATCH:/auth/email
   */
  updateEmailUsingPatch = (
    param: EmailUpdateParam,
    params: RequestParams = {},
  ) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/auth/email`,
      method: 'PATCH',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name LoginUsingPost
   * @summary 权限-登录
   * @request POST:/auth/login
   */
  loginUsingPost = (loginParam: LoginParam, params: RequestParams = {}) =>
    this.request<ResLoginUserInfoVO, void>({
      path: `/auth/login`,
      method: 'POST',
      body: loginParam,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name CodemaoLoginUsingPost
   * @summary 权限-编程猫账号登录
   * @request POST:/auth/login/codemao
   */
  codemaoLoginUsingPost = (
    codemaoLoginParam: CodemaoLoginParam,
    params: RequestParams = {},
  ) =>
    this.request<ResLoginUserInfoVO, void>({
      path: `/auth/login/codemao`,
      method: 'POST',
      body: codemaoLoginParam,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name FirebaseLoginUsingPost
   * @summary 权限-Firebase登录
   * @request POST:/auth/login/firebase
   */
  firebaseLoginUsingPost = (
    firebaseLoginParam: FirebaseLoginParam,
    params: RequestParams = {},
  ) =>
    this.request<ResLoginUserInfoVO, void>({
      path: `/auth/login/firebase`,
      method: 'POST',
      body: firebaseLoginParam,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name FlashLoginUsingPost
   * @summary 权限-一键登录 APP端 原生
   * @request POST:/auth/login/flash
   */
  flashLoginUsingPost = (
    loginParam: OauthLoginParam,
    params: RequestParams = {},
  ) =>
    this.request<ResLoginUserInfoVO, void>({
      path: `/auth/login/flash`,
      method: 'POST',
      body: loginParam,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name OauthAppUsingPost
   * @summary 权限-第三方登录 APP端 原生
   * @request POST:/auth/login/oauth/app
   */
  oauthAppUsingPost = (
    oauthLoginParam: OauthLoginParam,
    params: RequestParams = {},
  ) =>
    this.request<ResLoginUserInfoVO, void>({
      path: `/auth/login/oauth/app`,
      method: 'POST',
      body: oauthLoginParam,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name OauthUsingPost
   * @summary 权限-第三方登陆/绑定 web端
   * @request POST:/auth/login/oauth/web
   */
  oauthUsingPost = (
    oauthCallBackParam: OauthCallBackParam,
    params: RequestParams = {},
  ) =>
    this.request<ResLoginUserInfoVO, void>({
      path: `/auth/login/oauth/web`,
      method: 'POST',
      body: oauthCallBackParam,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name WebOauthUrlUsingPost
   * @summary 权限-第三方登录 web端 获取第三方授权地址
   * @request POST:/auth/login/oauth/web-url
   */
  webOauthUrlUsingPost = (
    oauthLoginParam: OauthLoginParam,
    params: RequestParams = {},
  ) =>
    this.request<ResOauthRedirectVO, void>({
      path: `/auth/login/oauth/web-url`,
      method: 'POST',
      body: oauthLoginParam,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name PhoneLoginUsingPost
   * @summary 权限-短信登录
   * @request POST:/auth/login/phone
   */
  phoneLoginUsingPost = (param: PhoneLoginParam, params: RequestParams = {}) =>
    this.request<ResLoginUserInfoVO, void>({
      path: `/auth/login/phone`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name LogoutUsingPost
   * @summary 权限-退出登录
   * @request POST:/auth/logout
   */
  logoutUsingPost = (params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/auth/logout`,
      method: 'POST',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name OfflineUsingPost
   * @summary 权限-离线标记
   * @request POST:/auth/offline
   */
  offlineUsingPost = (params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/auth/offline`,
      method: 'POST',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name OnlineUsingPost
   * @summary 权限-在线标记
   * @request POST:/auth/online/{entry}
   */
  onlineUsingPost = (entry?: string, params: RequestParams = {}) =>
    this.request<ResLoginUserInfoVO, void>({
      path: `/auth/online/${entry}`,
      method: 'POST',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name UpdatePhoneUsingPatch
   * @summary 权限-修改绑定手机
   * @request PATCH:/auth/phone
   */
  updatePhoneUsingPatch = (
    param: PhoneUpdateParam,
    params: RequestParams = {},
  ) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/auth/phone`,
      method: 'PATCH',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name UpdatePwdUsingPatch
   * @summary 权限-修改密码
   * @request PATCH:/auth/pwd
   */
  updatePwdUsingPatch = (param: PwdUpdateParam, params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/auth/pwd`,
      method: 'PATCH',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name RegisterUsingPost
   * @summary 权限-注册
   * @request POST:/auth/register
   */
  registerUsingPost = (param: RegisterParam, params: RequestParams = {}) =>
    this.request<ResLoginUserInfoVO, void>({
      path: `/auth/register`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name ExperienceRegisterUsingPost
   * @summary 权限-体验号快捷注册【请求头携带Device-ID】
   * @request POST:/auth/register/experience
   */
  experienceRegisterUsingPost = (
    query?: { recommendBy?: number },
    params: RequestParams = {},
  ) =>
    this.request<ResLoginUserInfoVO, void>({
      path: `/auth/register/experience`,
      method: 'POST',
      query: query,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name VerifyResetPwdCodeUsingPost
   * @summary 权限-密码重置-验证码校验
   * @request POST:/auth/reset-pwd/verify
   */
  verifyResetPwdCodeUsingPost = (
    param: VerifyResetPwdParam,
    params: RequestParams = {},
  ) =>
    this.request<ResSingleValueVOString, void>({
      path: `/auth/reset-pwd/verify`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name SendCodeUsingPost
   * @summary 权限-发送验证码
   * @request POST:/auth/send-code
   */
  sendCodeUsingPost = (param: AuthSendCodeParam, params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/auth/send-code`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name SetCookieUsingPost
   * @summary 权限-设置cookie
   * @request POST:/auth/set-cookie
   */
  setCookieUsingPost = (query: { token: string }, params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/auth/set-cookie`,
      method: 'POST',
      query: query,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 权限
   * @name UnbindUsingPost
   * @summary 权限-微信/qq/微博/编程猫账号解绑
   * @request POST:/auth/unbind/{provider}
   */
  unbindUsingPost = (provider?: string, params: RequestParams = {}) =>
    this.request<ResLoginUserInfoVO, void>({
      path: `/auth/unbind/${provider}`,
      method: 'POST',
      type: ContentType.Json,
      ...params,
    });
}
