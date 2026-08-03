import { MuSchema } from '@box-local/mudb/schema';
import { ProjectDataTypes, ProjectData } from '../def';
export declare function migrate(bytes: Uint8Array): ProjectData | undefined;
export declare function projectBytesToSchema(bytes: Uint8Array): {
    version: number;
    schema: import("@box-local/mudb/schema/struct").Struct<{
        version: import("@box-local/mudb/schema").MuVarint;
        nodes: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuASCII;
            type: MuSchema<import("../..").ProjectNodeType>;
            name: import("@box-local/mudb/schema").MuUTF8;
            voxelId: import("@box-local/mudb/schema").MuASCII;
            parentId: import("@box-local/mudb/schema").MuASCII;
            childrenIds: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuASCII>;
            pivot: import("@box-local/mudb/schema").MuVector<"float32", 3>;
            position: import("@box-local/mudb/schema").MuVector<"float32", 3>;
            quaternion: import("@box-local/mudb/schema").MuVector<"float32", 4>;
        }>>;
        voxels: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuASCII;
            encodedView: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            localPalette: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuInt32>;
        }>>;
        palette: import("@box-local/mudb/schema").MuStruct<{
            items: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuASCII;
                color: import("@box-local/mudb/schema").MuStruct<{
                    r: import("@box-local/mudb/schema").MuUint8;
                    g: import("@box-local/mudb/schema").MuUint8;
                    b: import("@box-local/mudb/schema").MuUint8;
                }>;
                hsv: import("@box-local/mudb/schema").MuVector<"uint16", 3>;
                material: import("@box-local/mudb/schema").MuStruct<{
                    emissive: import("@box-local/mudb/schema").MuFloat32;
                }>;
            }>>;
            groups: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuASCII;
                name: import("@box-local/mudb/schema").MuUTF8;
                colorIndices: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            }>>;
            groupList: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuASCII>;
        }>;
    }>;
} | {
    version: 4 | 3 | 8 | 1 | 2 | 5 | 7 | 10 | 6 | 9;
    schema: ProjectDataTypes;
} | undefined;
export declare function projectSchemaToBytes(value: ProjectDataTypes): Uint8Array;
