import { MeshTextureSchema, MeshDataSchema } from '@box-local/mesher/schema';
import { MuArray, MuStruct, MuVarint } from '@box-local/mudb/schema';
import { ModelNodesSchema } from './schema-v2';
export { ModelNodeSchema, ModelNode } from './schema-v2';
export { ModelNodesSchema, MeshTextureSchema, MeshDataSchema };
export declare const ModelDataV4Schema: MuStruct<{
    version: MuVarint;
    nodes: MuArray<MuStruct<{
        mesh: import("@box-local/mudb/schema").MuInt32;
        rotation: import("@box-local/mudb/schema").MuVector<"float32", 4>;
        translation: import("@box-local/mudb/schema").MuVector<"float32", 3>;
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
        uvFlags: MuArray<import("@box-local/mudb/schema").MuUint8>;
    }>>>;
}>;
export type ModelDataV4 = typeof ModelDataV4Schema.identity;
