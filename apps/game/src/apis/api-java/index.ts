import axios from 'axios';
import {
  MaasAuth,
  Resource,
  JavaAuth,
  JavaUser,
  Createra,
  Model,
  Models,
  Container,
  Maas,
  Upload,
  Collaboration,
  CreatorStore,
} from '@box-local/apis';
import { clientConfig } from 'src/config/client';
import { isMaas } from 'src/utils/appEdition';
import { getToken } from 'src/utils/token';

export const cancelSource = axios.CancelToken.source();

export interface PagedData<T> {
  count: number;
  rows: T[];
}

function initAxios(baseURL: string) {
  /**
   * init axios instance
   */
  const axiosInstance = axios.create({
    baseURL,
    withCredentials: !clientConfig.mockJavaBackend,
    headers: {},
  });

  /**
   * inject Authorization into header
   */
  axiosInstance.interceptors.request.use(
    ({ cancelToken, headers, ...config }) => {
      const token = getToken();
      if (token) {
        headers.authorization = token;
      }
      // 过滤掉url search中的appId和token
      const urlObj = new URL(config.url || '', baseURL);
      const params = new URLSearchParams(urlObj.search);
      params.delete('appId');
      params.delete('token');
      urlObj.search = params.toString();
      config.url = urlObj.pathname + urlObj.search + urlObj.hash;
      return {
        // 自带 cancelToken 的就不覆盖
        cancelToken: cancelToken ?? cancelSource.token,
        headers,
        ...config,
      };
    },
  );
  return axiosInstance;
}

const axiosInstance = initAxios(
  isMaas()
    ? clientConfig.MAAS_BACKEND_SERVER_URL
    : clientConfig.CREATERA_BACKEND_SERVER_URL,
);
const javaAxiosInstance = initAxios(
  isMaas()
    ? clientConfig.MAAS_BACKEND_SERVER_URL
    : clientConfig.JAVA_BACKEND_SERVER_URL,
);
const uploadApi = new Upload(axiosInstance);
const modelApi = new Model(axiosInstance);
const modelsApi = new Models(axiosInstance);
const createraApi = new Createra(axiosInstance);

if (clientConfig.isLocalGameServer) {
  createraApi.nextGameUidListUsingGet = async ({ num }) => {
    const count = Math.max(0, Math.min(1000, Number(num) || 0));
    return Array.from(
      { length: count },
      () => `local-${globalThis.crypto.randomUUID()}`,
    );
  };

  uploadApi.fileUploadPost = async ({ file }) => {
    if (!file) throw new Error('请选择要上传的文件');
    const response = await fetch('/runtime/edit/block', {
      method: 'POST',
      body: file,
    });
    if (!response.ok) {
      throw new Error((await response.text()) || '本地资源保存失败');
    }
    return await response.text();
  };

  const voxaRequest = async (path: string, init?: RequestInit) => {
    if (!clientConfig.VOXA_URL) {
      throw new Error('本地 VOXA 地址未配置，请先启动 VOXA');
    }
    const response = await fetch(
      `${clientConfig.VOXA_URL.replace(/\/$/, '')}/api/local${path}`,
      init,
    );
    if (!response.ok) {
      throw new Error((await response.text()) || '本地 VOXA 请求失败');
    }
    return await response.json();
  };

  const absoluteVoxaURL = (value?: string) => {
    if (!value || /^https?:\/\//.test(value)) return value;
    return `${clientConfig.VOXA_URL.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
  };

  modelApi.getModelDetailUsingGet = async (modelId) =>
    voxaRequest(`/models/${modelId}`);
  modelApi.deleteModelUsingDelete = async (modelIds) => {
    const results = await Promise.all(
      modelIds.map((modelId) =>
        voxaRequest(`/models/${modelId}`, { method: 'DELETE' }),
      ),
    );
    return results.every(Boolean);
  };
  modelApi.deleteProjectSharedModelUsingDelete = async ({ modelId }) =>
    voxaRequest(`/models/${modelId}`, { method: 'DELETE' });
  modelApi.renameProjectSharedModelUsingPut = async ({ modelId, modelName }) =>
    voxaRequest(`/models/${modelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelName }),
    });
  const defaultSkinProjectScope = (mapId: number) =>
    String(clientConfig.name || mapId);
  modelApi.setDefaultSkinUsingPut = async ({ mapId, skinId }) => {
    const projectKey = defaultSkinProjectScope(mapId);
    return voxaRequest(
      `/default-skin?projectKey=${encodeURIComponent(projectKey)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectKey, mapId, skinId }),
      },
    );
  };
  modelApi.getDefaultSkinUsingGet = async ({ mapId }) => {
    const projectKey = defaultSkinProjectScope(mapId);
    const skin = await voxaRequest(
      `/default-skin?projectKey=${encodeURIComponent(projectKey)}`,
    );
    return skin
      ? { ...skin, modelPreviewUrl: absoluteVoxaURL(skin.modelPreviewUrl) }
      : undefined;
  };
  modelApi.getSkinMapIdList = async () => [];
  modelApi.batchAddSkinUsingPost = async () => true;

  modelsApi.getModelsUsingGetV2 = async (query) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null) params.set(key, String(value));
    }
    const result = await voxaRequest(`/models?${params}`);
    return {
      ...result,
      rows: result.rows.map((model) => ({
        ...model,
        modelPreviewUrl: absoluteVoxaURL(model.modelPreviewUrl),
      })),
    };
  };
  modelsApi.deleteSharedSkinUsingDelete = async ({ skinId }) =>
    voxaRequest(`/models/${skinId}`, { method: 'DELETE' });
  modelsApi.renameSharedSkinUsingPut = async ({ skinId, skinName }) =>
    voxaRequest(`/models/${skinId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelName: skinName }),
    });
}

export const apis = {
  // maas or java backend
  auth: new JavaAuth(javaAxiosInstance),
  // java backend only
  user: new JavaUser(javaAxiosInstance),
  // createra backend only
  createra: createraApi,
  // createra collaboration
  collaboration: new Collaboration(axiosInstance),
  // createra creatorStore
  creatorStore: new CreatorStore(axiosInstance),
  // maas or createra backend
  models: modelsApi,
  // maas or createra backend
  model: modelApi,
  // maas or createra backend
  upload: uploadApi,
  // maas backend only
  container: new Container(axiosInstance),
  // maas backend only
  maas: new Maas(axiosInstance),
  // maas backend only
  maasAuth: new MaasAuth(axiosInstance),
  // maas backend only
  resource: new Resource(axiosInstance),
};
