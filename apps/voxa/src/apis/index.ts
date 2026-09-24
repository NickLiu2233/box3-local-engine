import axios from 'axios';

import { Permissions } from '@box/apis';

import { getToken } from '../utils/token';

export const cancelSource = axios.CancelToken.source();

const axiosInstance = axios.create({
  baseURL: '/api/local',
  withCredentials: false,
});

axiosInstance.interceptors.request.use(({ cancelToken, headers, ...config }) => {
  const token = getToken();
  if (token) headers.authorization = token;
  return {
    cancelToken: cancelToken ?? cancelSource.token,
    headers,
    ...config,
  };
});

function isEmbeddedInEngine() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('parentType') === 'engine';
}

export function resolveParentEditStorageURL(
  search: string,
  referrer: string,
  currentHref: string,
  hash = '',
  ancestorOrigin = '',
) {
  try {
    const currentURL = new URL(currentHref);
    const explicitOrigin = new URLSearchParams(search).get('storageOrigin');
    const candidate =
      explicitOrigin ||
      (referrer ? new URL(referrer).origin : '') ||
      ancestorOrigin;
    if (!candidate) return '';
    const storageOrigin = new URL(candidate);
    const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
    const sameLocalHost =
      loopbackHosts.has(storageOrigin.hostname.toLowerCase()) &&
      loopbackHosts.has(currentURL.hostname.toLowerCase());
    if (
      !['http:', 'https:'].includes(storageOrigin.protocol) ||
      (storageOrigin.hostname !== currentURL.hostname && !sameLocalHost)
    ) {
      return '';
    }
    const basePath = storageOrigin.pathname.replace(/\/$/, '') || '/runtime/edit';
    const encodedHash = hash ? `/${encodeURIComponent(hash)}` : '';
    return `${storageOrigin.origin}${basePath}/block${encodedHash}`;
  } catch {
    return '';
  }
}

function parentEditStorageURL(hash = '') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '';
  return resolveParentEditStorageURL(
    window.location.search,
    document.referrer,
    window.location.href,
    hash,
    window.location.ancestorOrigins?.[0] || '',
  );
}

async function storeLocalBlob(file: Blob) {
  const response = await fetch('/api/local/blob', {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!response.ok) throw new Error((await response.text()) || '本地文件保存失败');
  return String((await response.json()).hash || '');
}

async function storeBlob(file?: Blob) {
  if (!file) throw new Error('请选择要保存的文件');
  const localHash = await storeLocalBlob(file);
  if (!isEmbeddedInEngine()) return localHash;

  const storageURL = parentEditStorageURL();
  if (!storageURL) throw new Error('无法识别创作端本地存储地址');
  const response = await fetch(storageURL, { method: 'POST', body: file });
  if (!response.ok) {
    throw new Error((await response.text()) || '保存到当前地图失败');
  }
  const projectHash = (await response.text()).trim();
  if (projectHash !== localHash) {
    throw new Error('VOXA 与地图存储生成了不同的文件哈希');
  }
  return projectHash;
}

async function retrieveBlob(hash: string, config: Record<string, unknown> = {}) {
  try {
    return await axios.request({
      url: `/api/local/blobs/${encodeURIComponent(hash)}`,
      ...config,
    });
  } catch (error) {
    const parentURL = isEmbeddedInEngine() ? parentEditStorageURL(hash) : '';
    if (!parentURL || !axios.isAxiosError(error) || error.response?.status !== 404) {
      throw error;
    }
    return await axios.request({ url: parentURL, ...config });
  }
}

async function saveModel(input: Record<string, unknown>) {
  return (await axiosInstance.post('/models', input)).data;
}

export const apis = {
  createra: {
    async getUserByTokenUsingGet() {
      return { avatar: '', userId: 1, permission: 0, language: 'zh-CN' };
    },
    async setUserLanguage() {
      return true;
    },
  },
  model: {
    async getModelDetailUsingGet(modelId: number, params: Record<string, unknown> = {}) {
      return (await axiosInstance.get(`/models/${modelId}`, params)).data;
    },
    async getSnapshotsUsingGet(
      modelId: number,
      query: { autoSave: boolean },
      params: Record<string, unknown> = {},
    ) {
      return (
        await axiosInstance.get(`/models/${modelId}/snapshots`, {
          ...params,
          params: query,
        })
      ).data;
    },
    async saveModelUsingPostV1(input: Record<string, unknown>) {
      return saveModel(input);
    },
    async saveProjectSharedModelUsingPost(input: Record<string, unknown>) {
      return saveModel(input);
    },
    async saveSharedSkinUsingPost(input: Record<string, unknown>) {
      return saveModel(input);
    },
  },
  models: {
    async getModelsUsingGetV2(query: Record<string, unknown>) {
      const response = await axiosInstance.get('/models', { params: query });
      return response.data;
    },
  },
  upload: {
    async fileUploadPost({ file }: { file?: Blob }) {
      return storeBlob(file);
    },
  },
  content: {
    request<T>({ url, ...config }: { url: string } & Record<string, unknown>) {
      return retrieveBlob(url, config) as Promise<{ data: T }>;
    },
  },
  openApisAuth: {
    async checkPermission() {
      return [
        Permissions.UserVoxelEditor,
        Permissions.UserVoxelEditorMultiObj,
        Permissions.UserVoxelEditorMultiObjAnimation,
      ];
    },
  },
  openApisContent: {
    async getContentInfoByToken(value: string) {
      const modelId = Number(value);
      const model = (await axiosInstance.get(`/models/${modelId}`)).data;
      return {
        contentType: 1,
        modelInfo: model,
      };
    },
  },
  openApisUser: {
    async authToCookie() {
      return true;
    },
  },
  vobi: {
    async chatCompletions() {
      throw new Error('本地 VOXA 未启用云端 AI 服务');
    },
  },
};

export function getAxiosInstance() {
  return axiosInstance;
}
