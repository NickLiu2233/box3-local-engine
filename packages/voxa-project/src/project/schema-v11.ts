import { MuASCII, MuOption, MuStruct, MuUTF8, MuVarint } from '@box/mudb/schema';
import { ProjectDataV10Schema } from './schema-v10';

export * from './schema-v10';

export const PreviewExportSchema = new MuStruct({
  projectId: new MuASCII(),
  author: new MuUTF8(),
  description: new MuUTF8(),
  version: new MuUTF8('v1.0.0'),
  defaultAnimationId: new MuOption(new MuASCII(), undefined, true),
  lastExportedVersion: new MuUTF8(),
});

/** Preview publishing settings travel with the editable project. */
export const ProjectDataV11Schema = new MuStruct({
  ...ProjectDataV10Schema.muData,
  version: new MuVarint(11),
  previewExport: new MuOption(PreviewExportSchema, undefined, true),
});

export type ProjectDataV11 = typeof ProjectDataV11Schema.identity;
