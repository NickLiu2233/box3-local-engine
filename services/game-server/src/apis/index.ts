import { Createra, MapGroupProject, Model, Models, Storage } from '@box-local/apis';
import axios from 'axios';
import { ServerRuntimeConfig } from '../../config/server';

export let apis: {
  createra: Createra;
  model: Model;
  models: Models;
  storage: Storage;
  groupProject: MapGroupProject;
};

export function initApis(config: ServerRuntimeConfig) {
  const instance = axios.create({
    baseURL: config.INTRANET_CREATERA_BACKEND_SERVER_URL,
    headers: { 'request-header-fixed-key': config.BACKEND_AUTH_CODE },
  });
  const storageInstance = axios.create({
    baseURL: config.INTRANET_STORAGE_BACKEND_SERVER_URL,
  });

  apis = {
    createra: new Createra(instance),
    model: new Model(instance),
    models: new Models(instance),
    storage: new Storage(storageInstance),
    // groupProject
    groupProject: new MapGroupProject(instance),
  };
}
