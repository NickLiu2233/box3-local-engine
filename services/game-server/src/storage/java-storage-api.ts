import { Logger } from '@box-local/utils/logger';

import { ListPageOptions } from '@box-local/schema/api/js/storage';
import { CommonGameDataServer, TableType } from './types';
import { getConfigSync } from '../../config/server';
import { apis } from '../apis';

export class JavaDataStorage implements CommonGameDataServer {
  constructor(public logger: Logger) {}

  public async connect() {}

  public async close() {}

  // 对数据库key加锁
  private _lockKey = async ({
    key,
    ticket,
    storageName,
    tableType,
  }: {
    key: string;
    ticket: string;
    storageName: string;
    tableType: TableType;
  }) => {
    const config = getConfigSync();
    const params: Parameters<typeof apis.storage.lockUsingPost>[0] = {
      key,
      mapId:
        tableType === 'group' ? config.groupId + '' : config.contentId + '',
      mode: config.mode,
      storageName,
      isGroup: tableType === 'group',
      ticket,
    };
    await apis.storage.lockUsingPost(params);
  };
  // 对数据库key解锁
  private _unLockKey = async ({
    key,
    ticket,
    storageName,
    tableType,
  }: {
    key: string;
    ticket: string;
    storageName: string;
    tableType: TableType;
  }) => {
    const config = getConfigSync();
    const params: Parameters<typeof apis.storage.unlockUsingPost>[0] = {
      key,
      mapId:
        tableType === 'group' ? config.groupId + '' : config.contentId + '',
      mode: config.mode,
      storageName,
      isGroup: tableType === 'group',
      ticket,
    };
    await apis.storage.unlockUsingPost(params);
  };

  public async createTable(tableType: TableType, table: string) {
    const config = getConfigSync();
    const params: Parameters<typeof apis.storage.prepareUsingPost>[0] = {
      mapId:
        tableType === 'group' ? config.groupId + '' : config.contentId + '',
      mode: config.mode,
      storageName: table,
      isGroup: tableType === 'group',
    };
    this.logger.log(
      `[storage] in Java api [createTable], params is ${JSON.stringify(
        params,
      )} `,
    );
    await apis.storage.prepareUsingPost(params);
  }

  // 获取单个数据
  public async get(
    tableType: TableType,
    table: string,
    key: string,
    version?: string,
    ticket?: string,
  ) {
    if (!table) {
      throw new Error('db name is invalid!');
    }
    if (ticket) {
      await this._lockKey({ key, ticket, storageName: table, tableType });
    }

    try {
      const config = getConfigSync();
      const params = {
        key,
        mapId:
          tableType === 'group' ? config.groupId + '' : config.contentId + '',
        mode: config.mode,
        storageName: table,
        isGroup: tableType === 'group',
        ticket,
      };
      const res = await apis.storage.getUsingGet(params);
      this.logger.log(
        `[storage] in Java api [get], params is ${JSON.stringify(params)} `,
      );
      // value 存储在 content 字段中
      if (res?.value) {
        const value = JSON.parse(res.value);
        res.value = value.content;
      }
      return res;
    } catch (err) {
      // get 报错，如果已经上锁则解锁
      if (ticket) {
        await this._unLockKey({ key, ticket, storageName: table, tableType });
      }
      throw err;
    }
  }

  public async list(
    tableType: TableType,
    table: string,
    options: ListPageOptions,
  ) {
    const { cursor, pageSize, max, min, ascending, constraintTarget } = options;

    if (!table) {
      throw new Error('name is invalid!');
    }
    if (!pageSize) {
      throw new Error('pageSize is needed!');
    }

    const config = getConfigSync();
    const params: Parameters<typeof apis.storage.pageListUsingGet>[0] = {
      'mapId':
        tableType === 'group' ? config.groupId + '' : config.contentId + '',
      'mode': config.mode,
      'storageName': table,
      'constraint.ascending': ascending,
      'constraint.max': max,
      'constraint.min': min,
      // 不传则默认为content
      'constraint.target': constraintTarget
        ? `content.${constraintTarget}`
        : 'content',
      'limit': pageSize,
      'offset': cursor * pageSize,
      'isGroup': tableType === 'group',
    };
    this.logger.log(
      `[storage] in Java api [list], params is ${JSON.stringify(params)} `,
    );
    const res = await apis.storage.pageListUsingGet(params);
    // value 存储在 content 字段中
    return {
      items: res.rows.map((item) => {
        return {
          key: item.key,
          value: JSON.parse(item.value).content,
          version: item.version,
          updateTime: item.updateTime,
          createTime: item.createTime,
        };
      }),
      isLastPage: res.count <= (cursor + 1) * pageSize,
    };
  }

  // 更新/插入单个数据
  public async set(
    tableType: TableType,
    table: string,
    key: string,
    value: any,
    ticket?: string,
  ) {
    if (!table) {
      throw new Error('name is invalid!');
    }
    const config = getConfigSync();
    const params: Parameters<typeof apis.storage.setUsingPost>[0] = {
      mapId:
        tableType === 'group' ? config.groupId + '' : config.contentId + '',
      mode: config.mode,
      storageName: table,
      isGroup: tableType === 'group',
      key,
      value: JSON.stringify({ content: value }),
      ticket,
    };
    this.logger.log(
      `[storage] in Java api [set], params is ${JSON.stringify(params)}`,
    );
    await apis.storage.setUsingPost(params);
    if (ticket) {
      await this._unLockKey({ key, ticket, storageName: table, tableType });
    }
  }

  public async increment(
    tableType: TableType,
    table: string,
    key: string,
    value: number,
  ) {
    if (!table) {
      throw new Error('name is invalid!');
    }
    const config = getConfigSync();
    const params: Parameters<typeof apis.storage.incrUsingPost>[0] = {
      mapId:
        tableType === 'group' ? config.groupId + '' : config.contentId + '',
      mode: config.mode,
      storageName: table,
      isGroup: tableType === 'group',
      key,
      value,
    };
    this.logger.log(
      `[storage] in Java api [increment], params is ${JSON.stringify(params)}`,
    );
    return await apis.storage.incrUsingPost(params);
  }

  // 删除数据并返回删除前最新的一条数据
  public async remove(
    tableType: TableType,
    table: string,
    key: string,
    ticket?: string,
  ) {
    if (ticket) {
      await this._lockKey({ key, ticket, storageName: table, tableType });
    }
    try {
      const config = getConfigSync();
      const params: Parameters<typeof apis.storage.removeUsingDelete>[0] = {
        key,
        mapId:
          tableType === 'group' ? config.groupId + '' : config.contentId + '',
        mode: config.mode,
        storageName: table,
        isGroup: tableType === 'group',
        returnOld: true,
        ticket,
      };
      this.logger.log(
        `[storage] in Java api [remove], params is ${JSON.stringify(params)}} `,
      );
      const res = await apis.storage.removeUsingDelete(params);
      if (res?.value) {
        const value = JSON.parse(res.value);
        res.value = value.content;
      }
      return res;
    } finally {
      if (ticket) {
        await this._unLockKey({ key, ticket, storageName: table, tableType });
      }
    }
  }

  public async dropTable(tableType: TableType, table: string) {
    const config = getConfigSync();
    const params: Parameters<typeof apis.storage.deleteStorageUsingDelete>[0] =
      {
        mapId:
          tableType === 'group' ? config.groupId + '' : config.contentId + '',
        mode: config.mode,
        storageName: table,
        isGroup: tableType === 'group',
      };
    this.logger.log(
      `[storage] in Java api [dropTable], params is ${JSON.stringify(params)}`,
    );
    await apis.storage.deleteStorageUsingDelete(params);
  }
}
