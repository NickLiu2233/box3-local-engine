import type { Logger } from 'pino';

import { GoIPFSStore } from '@box-local/content-server/ipfs-http-store-node';
import { ObjectStoreService } from '@box-local/content-server/object-store-service';
import { VbFileData, parseVbFile } from '@box-local/vb-parser';
import {
  migrateProject,
  migrateModel,
  modelSchemaToBytes,
  projectSchemaToBytes,
  getModelMetaData,
  ModelMetaData,
} from '@box-local/voxa-project';

type RequestBody = {
  hashList: string[];
};

type Spec = {
  createraURL: string;
  maxContentServerConnections: number;
  ossCdnURL: string;
  contentServerURL: string;
  logger: Logger;
};

type HashDict = {
  /**
   * 原本vb的hash
   */
  originHash: string;
  /**
   * 新版本工程文件hash
   */
  projectHash: string;
  /**
   * 新版本模型文件hash
   */
  modelHash: string;
};

type ListResult =
  | {
      isSuccess: true;
      data: HashDict[];
    }
  | {
      isSuccess: false;
      data: [];
      errorMsg: string;
    };

const CONTENT_SERVER_RETRY_COUNT = 2;

export class VBMigration {
  private readonly ossContentServer: ObjectStoreService;
  private readonly ipfsContentServer: GoIPFSStore;

  constructor(spec: Spec) {
    const {
      createraURL,
      maxContentServerConnections,
      ossCdnURL,
      contentServerURL,
      logger,
    } = spec;

    this.ossContentServer = new ObjectStoreService({
      logger,
      uri: createraURL,
      cdnPath: ossCdnURL,
      maxConcurrency: maxContentServerConnections,
    });
    this.ossContentServer.retryCount = CONTENT_SERVER_RETRY_COUNT;

    this.ipfsContentServer = new GoIPFSStore({
      logger,
      uri: contentServerURL,
      maxConcurrency: maxContentServerConnections,
      pin: false,
    });
    this.ipfsContentServer.retryCount = CONTENT_SERVER_RETRY_COUNT;
  }

  public async migrateList(spec: { requestStr: string }): Promise<ListResult> {
    const { requestStr } = spec;

    let requestBody: RequestBody;

    try {
      requestBody = JSON.parse(requestStr);

      if (!Array.isArray(requestBody.hashList)) {
        return {
          isSuccess: false,
          data: [],
          errorMsg: 'Request body is missing hashList array',
        };
      }
    } catch (err) {
      return {
        isSuccess: false,
        data: [],
        errorMsg: `Failed to parse hash list, ${err}`,
      };
    }

    const list = requestBody.hashList.map(
      (vbHash) =>
        new Promise<HashDict>(async (resolve, reject) => {
          try {
            const res = await this.migrate({
              vbHash,
            });

            if (!res.isSuccess) {
              reject(`Failed to deal with hash ${vbHash}. ${res.errorMsg}`);
            } else {
              resolve(res.data);
            }
          } catch (err) {
            reject(`Error occurs when dealing hash ${vbHash}, ${err}`);
          }
        }),
    );

    try {
      const results = await Promise.all(list);

      return {
        isSuccess: true,
        data: results,
      };
    } catch (err) {
      return {
        isSuccess: false,
        data: [],
        errorMsg: err,
      };
    }
  }

  /**
   * 把旧版模型文件（vb）转换成最新版本的voxa模型数据和工程数据，并存储至cdn中。
   * 返回两个hash。
   */
  private async migrate(spec: { vbHash: string }): Promise<
    | {
        isSuccess: true;
        data: HashDict;
      }
    | {
        isSuccess: false;
        errorMsg: string;
      }
  > {
    const { vbHash } = spec;

    const vbRaw = await this.ipfsContentServer.retrieve(vbHash);

    if (!vbRaw) {
      return {
        isSuccess: false,
        errorMsg: 'Failed to get vb by hash',
      };
    }

    let projectVb: VbFileData;

    try {
      projectVb = JSON.parse(Buffer.from(vbRaw).toString());
    } catch (err) {
      return {
        isSuccess: false,
        errorMsg: `Failed to parse json, ${err}`,
      };
    }

    const { project, model } = parseVbFile(projectVb);

    const projectBytesV1 = new Uint8Array(
      Buffer.from(JSON.stringify(project), 'utf8'),
    );
    const latestProject = migrateProject(projectBytesV1);

    if (!latestProject) {
      return {
        isSuccess: false,
        errorMsg: 'Failed to migrate project',
      };
    }

    const projectBytes = projectSchemaToBytes(latestProject);

    const projectHash = await this.ossContentServer.store(projectBytes);

    const modelBytesV1 = new Uint8Array(
      Buffer.from(JSON.stringify(model), 'utf8'),
    );

    const tempMetaData = getModelMetaData('tempHash', modelBytesV1);

    if (!tempMetaData) {
      return {
        isSuccess: false,
        errorMsg: 'Failed to get model meta data',
      };
    }

    const latestModel = await migrateModel(modelBytesV1);

    if (!latestModel) {
      return {
        isSuccess: false,
        errorMsg: 'Failed to migrate model',
      };
    }

    const modelBytes = modelSchemaToBytes(latestModel);

    const modelDataHash = await this.ossContentServer.store(modelBytes);

    const modelMetaData: ModelMetaData = {
      version: latestModel.version,
      bounds: tempMetaData.bounds,
      dataHash: modelDataHash,
    };

    const metaBytes = new Uint8Array(
      Buffer.from(JSON.stringify(modelMetaData), 'utf8'),
    );

    const metaDataHash = await this.ossContentServer.store(metaBytes);

    return {
      isSuccess: true,
      data: {
        originHash: vbHash,
        projectHash,
        modelHash: metaDataHash,
      },
    };
  }
}
