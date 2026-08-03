import { BodyPartDataV1 } from './schema-v1';
import { BodyPartDataV2 } from './schema-v2';
import { BodyPartDataV3 } from './schema-v3';
export type BodyPartData = BodyPartDataV3;
export type BodyPartDataTypes = BodyPartDataV1 | BodyPartDataV2 | BodyPartDataV3;
export declare const VOXA_SKIN_VERSION = 3;
export declare const BODY_PART_SCHEMA: {
    1: import("@box-local/mudb/schema").MuStruct<{
        version: import("@box-local/mudb/schema").MuVarint;
        partId: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/player/player-schema").BodyPart>;
        bindMat: import("@box-local/mudb/schema").MuVector<"float32", 16>;
        bounds: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        nodes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
            mesh: import("@box-local/mudb/schema").MuInt32;
            rotation: import("@box-local/mudb/schema").MuVector<"float32", 4>;
            translation: import("@box-local/mudb/schema").MuVector<"float32", 3>;
            children: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            alpha: import("@box-local/mudb/schema").MuFloat32;
        }>>;
        texture: import("@box-local/mudb/schema").MuStruct<{
            palette: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUint32>;
            data: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            width: import("@box-local/mudb/schema").MuVarint;
        }>;
        meshes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
            vertices: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            sizes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            uvs: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            uvFlags: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUint8>;
        }>>>;
    }>;
    2: import("@box-local/mudb/schema").MuStruct<{
        version: import("@box-local/mudb/schema").MuVarint;
        partId: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/player/player-schema").BodyPart>;
        bindMat: import("@box-local/mudb/schema").MuVector<"float32", 16>;
        bounds: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        nodes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
            mesh: import("@box-local/mudb/schema").MuInt32;
            rotation: import("@box-local/mudb/schema").MuVector<"float32", 4>;
            translation: import("@box-local/mudb/schema").MuVector<"float32", 3>;
            scale: import("@box-local/mudb/schema").MuVector<"float32", 3>;
            children: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            alpha: import("@box-local/mudb/schema").MuFloat32;
        }>>;
        texture: import("@box-local/mudb/schema").MuStruct<{
            palette: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUint32>;
            data: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            width: import("@box-local/mudb/schema").MuVarint;
        }>;
        meshes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
            vertices: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            sizes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            uvs: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            uvFlags: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUint8>;
        }>>>;
    }>;
    3: import("@box-local/mudb/schema").MuStruct<{
        version: import("@box-local/mudb/schema").MuVarint;
        partId: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/player/player-schema").BodyPart>;
        bindMat: import("@box-local/mudb/schema").MuVector<"float32", 16>;
        bounds: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        nodes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
            mesh: import("@box-local/mudb/schema").MuInt32;
            rotation: import("@box-local/mudb/schema").MuVector<"float32", 4>;
            translation: import("@box-local/mudb/schema").MuVector<"float32", 3>;
            scale: import("@box-local/mudb/schema").MuVector<"float32", 3>;
            parentScaleMat3: import("@box-local/mudb/schema").MuVector<"float32", 9>;
            children: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            alpha: import("@box-local/mudb/schema").MuFloat32;
        }>>;
        texture: import("@box-local/mudb/schema").MuStruct<{
            palette: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUint32>;
            data: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            width: import("@box-local/mudb/schema").MuVarint;
        }>;
        meshes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
            vertices: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            sizes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            uvs: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            uvFlags: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUint8>;
        }>>>;
    }>;
};
