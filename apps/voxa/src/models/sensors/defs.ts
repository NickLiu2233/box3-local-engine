import type { SensorsProjectId } from '../../../configs/runtime-client';

/**
 * 神策埋点 - 公共属性
 */
export type SensorsRegisterOptions = {
  /**
   * 是否登录
   */
  is_login: () => boolean;
  /**
   * 项目
   */
  project_ID: SensorsProjectId;
};

export enum SensorsEventName {
  /**
   * 保存，目前只有手动保存
   */
  Save = 'VoxelSave',
  /**
   * 导入模型，目前只有导入.vox
   */
  Import = 'VoxelImport',
  /**
   * 导出模型，目前只有导出.gltf
   */
  Export = 'VoxelExport',
}

type BaseEvent = {
  name: SensorsEventName;
  payload: Record<string, string | number | boolean>;
};

/**
 * 模型保存事件
 */
export interface VoxelSaveEvent extends BaseEvent {
  name: SensorsEventName.Save;
  payload: {
    /**
     * 失败的原因
     */
    fail_reason?: string;
    /**
     * 是否新建
     */
    is_first_save: boolean;
    /**
     * 是否成功
     */
    is_success: boolean;
    /**
     * 模型ID
     */
    voxel_id?: number;
    /**
     * 模型名字
     */
    voxel_name: string;
  };
}

export interface VoxelImportEvent extends BaseEvent {
  name: SensorsEventName.Import;
  payload: {
    /**
     * 失败的原因
     */
    fail_reason?: string;
    /**
     * 是否成功
     */
    is_success: boolean;
  };
}

export interface VoxelExportEvent extends BaseEvent {
  name: SensorsEventName.Export;
  payload: {
    /**
     * 失败的原因
     */
    fail_reason?: string;
    /**
     * 是否成功
     */
    is_success: boolean;
  };
}

export type SensorsEvents =
  | VoxelSaveEvent
  | VoxelExportEvent
  | VoxelImportEvent;
