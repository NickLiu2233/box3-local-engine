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

if (clientConfig.isLocalGameServer) {
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
}

export const apis = {
  // maas or java backend
  auth: new JavaAuth(javaAxiosInstance),
  // java backend only
  user: new JavaUser(javaAxiosInstance),
  // createra backend only
  createra: new Createra(axiosInstance),
  // createra collaboration
  collaboration: new Collaboration(axiosInstance),
  // createra creatorStore
  creatorStore: new CreatorStore(axiosInstance),
  // maas or createra backend
  models: new Models(axiosInstance),
  // maas or createra backend
  model: new Model(axiosInstance),
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
