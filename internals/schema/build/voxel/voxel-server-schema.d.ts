import { MuStruct, MuBoolean, MuArray, MuUint32, MuSchema, MuVarint } from '@box-local/mudb/schema';
import { VoxelView } from '@box-local/utils/voxel';
import type { VoxelCollisionChunk } from './voxel-collision-schema';
export declare const ServerVoxelPreloadDataSchema: MuStruct<{
    nx: MuUint32;
    ny: MuUint32;
    nz: MuUint32;
    hashes: MuArray<import("@box-local/mudb/schema").MuASCII>;
    boxes: MuArray<import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        minX: import("@box-local/mudb/schema").MuUint8;
        minY: import("@box-local/mudb/schema").MuUint8;
        minZ: import("@box-local/mudb/schema").MuUint8;
        maxX: import("@box-local/mudb/schema").MuUint8;
        maxY: import("@box-local/mudb/schema").MuUint8;
        maxZ: import("@box-local/mudb/schema").MuUint8;
        faces: import("@box-local/mudb/schema").MuUint8;
        block: MuVarint;
    }>>>;
}>;
export type ServerVoxelPreloadData = typeof ServerVoxelPreloadDataSchema.identity;
export declare const ServerVoxelChunkSchema: MuStruct<{
    hash: import("@box-local/mudb/schema").MuASCII;
    versionCounter: MuVarint;
    dirtyGeom: MuBoolean;
    dirtyBoxes: MuBoolean;
    dirtyHash: MuBoolean;
    voxels: MuSchema<VoxelView>;
    geom: MuSchema<VoxelCollisionChunk>;
    boxes: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        minX: import("@box-local/mudb/schema").MuUint8;
        minY: import("@box-local/mudb/schema").MuUint8;
        minZ: import("@box-local/mudb/schema").MuUint8;
        maxX: import("@box-local/mudb/schema").MuUint8;
        maxY: import("@box-local/mudb/schema").MuUint8;
        maxZ: import("@box-local/mudb/schema").MuUint8;
        faces: import("@box-local/mudb/schema").MuUint8;
        block: MuVarint;
    }>>;
}>;
export type ServerVoxelChunk = typeof ServerVoxelChunkSchema.identity;
export declare const PendingVoxelWriteSchema: MuArray<MuStruct<{
    x: import("@box-local/mudb/schema").MuUint16;
    y: import("@box-local/mudb/schema").MuUint16;
    z: import("@box-local/mudb/schema").MuUint16;
    b: import("@box-local/mudb/schema").MuUint16;
}>>;
export declare const ServerVoxelConnectionSchema: MuStruct<{
    ready: MuBoolean;
    runs: MuArray<MuStruct<{
        offset: MuVarint;
        count: MuVarint;
        block: import("@box-local/mudb/schema").MuRelativeVarint;
    }>>;
}>;
export declare const ServerVoxelStateSchema: MuStruct<{
    ready: MuBoolean;
    resetCounter: MuUint32;
    pendingWrites: MuArray<MuStruct<{
        x: import("@box-local/mudb/schema").MuUint16;
        y: import("@box-local/mudb/schema").MuUint16;
        z: import("@box-local/mudb/schema").MuUint16;
        b: import("@box-local/mudb/schema").MuUint16;
    }>>;
    innerAO: MuBoolean;
    chunks: MuArray<MuStruct<{
        hash: import("@box-local/mudb/schema").MuASCII;
        versionCounter: MuVarint;
        dirtyGeom: MuBoolean;
        dirtyBoxes: MuBoolean;
        dirtyHash: MuBoolean;
        voxels: MuSchema<VoxelView>;
        geom: MuSchema<VoxelCollisionChunk>;
        boxes: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
            minX: import("@box-local/mudb/schema").MuUint8;
            minY: import("@box-local/mudb/schema").MuUint8;
            minZ: import("@box-local/mudb/schema").MuUint8;
            maxX: import("@box-local/mudb/schema").MuUint8;
            maxY: import("@box-local/mudb/schema").MuUint8;
            maxZ: import("@box-local/mudb/schema").MuUint8;
            faces: import("@box-local/mudb/schema").MuUint8;
            block: MuVarint;
        }>>;
    }>>;
    dirty: MuArray<MuSchema<import("@box-local/mudb/schema/struct").Struct<{
        hash: import("@box-local/mudb/schema").MuASCII;
        versionCounter: MuVarint;
        dirtyGeom: MuBoolean;
        dirtyBoxes: MuBoolean;
        dirtyHash: MuBoolean;
        voxels: MuSchema<VoxelView>;
        geom: MuSchema<VoxelCollisionChunk>;
        boxes: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
            minX: import("@box-local/mudb/schema").MuUint8;
            minY: import("@box-local/mudb/schema").MuUint8;
            minZ: import("@box-local/mudb/schema").MuUint8;
            maxX: import("@box-local/mudb/schema").MuUint8;
            maxY: import("@box-local/mudb/schema").MuUint8;
            maxZ: import("@box-local/mudb/schema").MuUint8;
            faces: import("@box-local/mudb/schema").MuUint8;
            block: MuVarint;
        }>>;
    }>>>;
}>;
export type ServerVoxelState = typeof ServerVoxelStateSchema.identity;
//# sourceMappingURL=voxel-server-schema.d.ts.map