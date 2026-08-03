import { MuArray, MuUint8, MuStruct } from '@box-local/mudb/schema';
import { ModelMeshSchema } from './modelMeshSchema';
export declare const MeshSchema: ModelMeshSchema;
export declare const meshBufferSchema: MuArray<MuUint8>;
export declare const modelMeshSchema: MuStruct<{
    meshBuffer: MuArray<MuUint8>;
    pbrBuffer: MuArray<MuUint8>;
}>;
export declare const NewMeshSchema: MuStruct<{
    texture: MuStruct<{
        palette: MuArray<import("@box-local/mudb/schema").MuUint32>;
        data: MuArray<import("@box-local/mudb/schema").MuVarint>;
        width: import("@box-local/mudb/schema").MuVarint;
    }>;
    data: MuArray<MuStruct<{
        vertices: MuArray<import("@box-local/mudb/schema").MuVarint>;
        sizes: MuArray<import("@box-local/mudb/schema").MuVarint>;
        uvs: MuArray<import("@box-local/mudb/schema").MuVarint>;
        uvFlags: MuArray<MuUint8>;
    }>>;
}>;
//# sourceMappingURL=voxel.d.ts.map