import { MuArray, MuVarint, MuStruct, MuUint8, MuSchema } from '@box-local/mudb/schema';
import { BodyPart } from '@box-local/schema/player/player-schema';
export declare const BodyPartDataV2Schema: MuStruct<{
    version: MuVarint;
    partId: MuSchema<BodyPart>;
    bindMat: import("@box-local/mudb/schema").MuVector<"float32", 16>;
    bounds: import("@box-local/mudb/schema").MuVector<"float32", 3>;
    nodes: MuArray<MuStruct<{
        mesh: import("@box-local/mudb/schema").MuInt32;
        rotation: import("@box-local/mudb/schema").MuVector<"float32", 4>;
        translation: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        scale: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        children: MuArray<MuVarint>;
        alpha: import("@box-local/mudb/schema").MuFloat32;
    }>>;
    texture: MuStruct<{
        palette: MuArray<import("@box-local/mudb/schema").MuUint32>;
        data: MuArray<MuVarint>;
        width: MuVarint;
    }>;
    meshes: MuArray<MuArray<MuStruct<{
        vertices: MuArray<MuVarint>;
        sizes: MuArray<MuVarint>;
        uvs: MuArray<MuVarint>;
        uvFlags: MuArray<MuUint8>;
    }>>>;
}>;
export type BodyPartDataV2 = typeof BodyPartDataV2Schema.identity;
