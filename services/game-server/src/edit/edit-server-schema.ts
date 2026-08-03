import {
  MuStruct,
  MuSchema,
  MuUint32,
  MuArray,
  MuASCII,
  MuBoolean,
} from '@box-local/mudb/schema';
import { MuRefSchema } from '@box-local/schema/utils/ref-schema';
import { Logger } from '@box-local/utils/logger';
import { ReplicaServerStateSchema } from './replica/replica-server-schema';
import { GameServer } from '..';
import { ContentServer } from '@box-local/content-server';
import { ProjectBakeCache } from '@box-local/build-system/project/bake';
import { BuildSystemAPI } from '@box-local/build-system/type';
import { PublishServerStateSchema } from './publish/publish-server-schema';
import { CodeEditorServerStateSchema } from './code-editor/code-editor-server-state';
import { BackendRPC } from '@box-local/schema/backend/rpc-interface';

export const EditServerStateSchema = new MuStruct({
  // service references
  game: <MuSchema<GameServer>>new MuRefSchema<GameServer>(),
  contentServer: <MuSchema<ContentServer>>new MuRefSchema<ContentServer>(),
  buildSystem: <MuSchema<BuildSystemAPI>>new MuRefSchema<BuildSystemAPI>(),
  bakeCache: <MuSchema<ProjectBakeCache>>new MuRefSchema<ProjectBakeCache>(),
  brpc: <MuSchema<BackendRPC>>new MuRefSchema<BackendRPC>(),

  // logger
  logger: <MuSchema<Logger>>new MuRefSchema<Logger>(),

  // replica state
  replica: ReplicaServerStateSchema,

  // publishing state
  publish: PublishServerStateSchema,

  codeEditor: CodeEditorServerStateSchema,
});

export type EditServerState = typeof EditServerStateSchema.identity;
