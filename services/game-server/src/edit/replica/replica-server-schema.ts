import {
  MuStruct,
  MuSchema,
  MuBoolean,
  MuASCII,
  MuUTF8,
  MuArray,
  MuDictionary,
  MuFloat64,
  MuVarint,
  MuDate,
} from '@box-local/mudb/schema';
import { MuRefSchema } from '@box-local/schema/utils/ref-schema';
import { ProjectRDA } from '@box-local/schema/project/project-rda';
import { MuRDATypes } from '@box-local/mudb/rda';
import {
  PermissionsSchema,
  PermissionSetSchema,
  PermissionRDA,
  UserIdSchema,
} from '@box-local/schema/permissions/permission-rda';
import {
  ProjectStateSchema,
  VoxelWriteSequenceSchema,
} from '@box-local/schema/replica/replica-schema';
import {
  ExtraProjectInfoSchema,
  HotProjectSchema,
} from '@box-local/schema/project/hot-schema';

export const SessionPermissionSchema = new MuStruct({
  userId: UserIdSchema,

  permissions: PermissionSetSchema,

  groups: new MuArray(new MuUTF8(), Infinity),
  owner: new MuBoolean(false),
  guest: new MuBoolean(false),
});

export const SessionPermissionIndexSchema = new MuDictionary(
  SessionPermissionSchema,
  Infinity,
);

export const InviteLinkSchema = new MuStruct({
  tokenString: new MuASCII(),
  expiredAt: new MuDate(),
});

export type InviteLink = typeof InviteLinkSchema.identity;

export const ReplicaServerStateSchema = new MuStruct({
  projectHash: new MuASCII(),
  projectStore: <MuSchema<MuRDATypes<typeof ProjectRDA>['store']>>(
    new MuRefSchema<MuRDATypes<typeof ProjectRDA>['store']>()
  ),
  project: ProjectStateSchema,
  projectDirty: new MuBoolean(false),
  projectHashDirty: new MuBoolean(false),
  defaultGroups: new MuArray(new MuUTF8(''), Infinity),
  hotProjectDirty: new MuBoolean(true),
  hotProject: HotProjectSchema,
  extraProjectInfo: ExtraProjectInfoSchema,
  lastAutoSave: new MuFloat64(0),
  lastImageHash: new MuASCII(''),
  lastOptimizedHash: new MuASCII(''),
  permissionHash: new MuASCII(),
  permissionStore: <MuSchema<MuRDATypes<typeof PermissionRDA>['store']>>(
    new MuRefSchema<MuRDATypes<typeof PermissionRDA>['store']>()
  ),
  permissions: PermissionsSchema,
  permissionsHashDirty: new MuBoolean(false),
  permissionsDirty: new MuBoolean(false),

  sessionPermission: SessionPermissionIndexSchema,
  applications: new MuArray(UserIdSchema, Infinity),
  newApplicants: new MuDictionary(new MuBoolean(false), Infinity),

  bufferedVoxelWrites: VoxelWriteSequenceSchema,

  adminUsers: new MuDictionary(new MuBoolean(false), Infinity),

  inviteLink: new MuArray(InviteLinkSchema, Infinity),

  inviteLinkGroup: new MuUTF8(''),
});
