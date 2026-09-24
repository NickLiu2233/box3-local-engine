import axios from 'axios';
import { Createra } from '@box/apis';
import { getServerConfig } from '../configs/server';

let _createraInstance: Createra;

export async function getCreateraInstance() {
  const config = await getServerConfig();
  if (!_createraInstance) {
    _createraInstance = new Createra(
      axios.create({
        baseURL: config.CREATERA_BACKEND_SERVER_URL,
        headers: {
          'request-header-fixed-key': config.BACKEND_AUTH_CODE,
        },
      }),
    );
  }
  return _createraInstance;
}
