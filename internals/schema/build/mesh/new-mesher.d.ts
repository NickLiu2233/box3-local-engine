import { VoxelView } from '@box-local/utils/voxel';
export declare function generateNewMesh(voxel: VoxelView, palette: number[] | [number, number, number][], emissivePalette: number[], surfaceOnly?: boolean): Promise<import("@box-local/mudb/schema/struct").Struct<{
    texture: import("@box-local/mudb/schema").MuStruct<{
        palette: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUint32>;
        data: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        width: import("@box-local/mudb/schema").MuVarint;
    }>;
    data: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
        vertices: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        sizes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        uvs: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        uvFlags: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUint8>;
    }>>;
}>>;
//# sourceMappingURL=new-mesher.d.ts.map