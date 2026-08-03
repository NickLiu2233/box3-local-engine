import { Createra, MapGroupProject, Model, Models, Storage } from '@box-local/apis';
import axios from 'axios';
import { ServerRuntimeConfig } from '../../config/server';
import { BoxApi } from './box-api';

export let apis: {
  createra: Createra;
  model: Model;
  models: Models;
  storage: Storage;
  groupProject: MapGroupProject;
  boxApi: BoxApi;
};

export function initApis(config: ServerRuntimeConfig) {
  const instance = axios.create({
    baseURL: config.INTRANET_CREATERA_BACKEND_SERVER_URL,
    headers: { 'request-header-fixed-key': config.BACKEND_AUTH_CODE },
  });
  const storageInstance = axios.create({
    baseURL: config.INTRANET_STORAGE_BACKEND_SERVER_URL,
  });
  const boxApiInstance = axios.create({
    baseURL: config.INTRANET_BOX_API_URL || 'http://localhost:3003',
    headers: { Authorization: `Bearer ${config.BACKEND_AUTH_CODE}` },
  });

  apis = {
    createra: new Createra(instance),
    model: new Model(instance),
    models: new Models(instance),
    storage: new Storage(storageInstance),
    // groupProject
    groupProject: new MapGroupProject(instance),
    boxApi: new BoxApi(boxApiInstance),
  };
}
