import { describe, expect, test } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import {
  compatibilityDiagnostics,
  importResponseError,
  serializeImportError,
} from './import-diagnostics';

describe('map import diagnostics', () => {
  test('preserves structured validation issues returned by an import API', () => {
    const error = importResponseError(
      {
        message: '工程包校验失败',
        details: [
          { level: 'error', code: 'missing-blob', message: '缺少资源 blob QmMissing' },
          { level: 'warning', code: 'empty-script', message: '入口脚本为空' },
        ],
      },
      400,
      '导入工程失败',
    );

    expect(error.message).toBe('工程包校验失败');
    expect(error.details).toEqual([
      { level: 'error', code: 'missing-blob', message: '缺少资源 blob QmMissing' },
      { level: 'warning', code: 'empty-script', message: '入口脚本为空' },
    ]);
  });

  test('turns compatibility errors and warnings into visible map-specific rows', () => {
    expect(compatibilityDiagnostics({
      level: 'error',
      summary: { errors: 1, warnings: 1, missingBlobCount: 1 },
      errors: [{ code: 'missing-blob', hash: 'QmMissing', message: '缺少资源 blob QmMissing' }],
      warnings: [{ code: 'cloud-http', message: '检测到云端 API 地址' }],
    })).toEqual([
      { level: 'error', code: 'missing-blob', message: '缺少资源 blob QmMissing' },
      { level: 'warning', code: 'cloud-http', message: '检测到云端 API 地址' },
    ]);
  });

  test('serializes nested server errors without exposing stack traces', () => {
    const nested = Object.assign(new Error('地图组成员关系无效'), {
      code: 'INVALID_MAP_GROUP',
    });
    const error = Object.assign(new Error('工程包校验失败'), {
      details: [{ code: 'missing-main', message: '缺少主地图' }],
      cause: nested,
    });

    expect(serializeImportError(error)).toEqual({
      message: '工程包校验失败',
      details: [
        { level: 'error', code: 'missing-main', message: '缺少主地图' },
        { level: 'error', code: 'INVALID_MAP_GROUP', message: '地图组成员关系无效' },
      ],
    });
  });

  test('creator and play import dialogs render every returned check detail', () => {
    const root = path.resolve(__dirname, '..');
    const creatorPage = fs.readFileSync(path.join(root, 'pages/projects/index.tsx'), 'utf8');
    const playPage = fs.readFileSync(path.join(root, 'pages/index.tsx'), 'utf8');
    const creatorApi = fs.readFileSync(
      path.join(root, 'pages/api/local-projects/import.ts'),
      'utf8',
    );
    const playApi = fs.readFileSync(path.join(root, 'pages/api/play-admin/import.ts'), 'utf8');

    for (const page of [creatorPage, playPage]) {
      expect(page).toContain('importResponseError');
      expect(page).toContain('importProgress.details.map');
      expect(page).toContain('检查详情');
    }
    expect(creatorPage).toContain('compatibilityDiagnostics(report)');
    expect(creatorApi).toContain('serializeImportError(error)');
    expect(playApi).toContain('serializeImportError(error)');
  });
});
