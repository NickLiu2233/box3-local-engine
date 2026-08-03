import { MuUTF8, MuStruct } from '@box-local/mudb/schema';
import {
  CursorDictSchema,
  FileDictSchema,
} from '@box-local/schema/code-editor/code-editor-common-state';

export const CodeEditorClientStateSchema = new MuStruct({
  cursorDict: CursorDictSchema,
  fileDict: FileDictSchema,
  selectedFileId: new MuUTF8(),
  sessionId: new MuUTF8(),
});
export type CodeEditorClientState = typeof CodeEditorClientStateSchema.identity;
