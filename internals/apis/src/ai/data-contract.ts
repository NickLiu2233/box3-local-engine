import type { ResObject } from '../data-contracts';

type SerializedVec3 = [number, number, number];

/**
 * 经过 ShapE -> open3D voxelization 生成的模型
 */
export type ShapEModel = {
  /**
   * rgb数组
   * 数值为小数（1 / 255）
   * 顺序与体素点一一对应
   */
  colors: SerializedVec3[];
  /**
   * 体素点坐标数组
   */
  grid_index: SerializedVec3[];
  /**
   * 模型尺寸
   */
  shape: SerializedVec3;
};

export interface ShapEResponse extends ResObject {
  data: ShapEModel;
}
