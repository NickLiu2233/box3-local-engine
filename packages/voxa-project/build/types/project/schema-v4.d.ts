import { MuStruct, MuVarint, MuArray } from '@box-local/mudb/schema';
import { VoxelsSchema, VoxelSchema, PaletteDataSchema, PaletteItemsSchema, PaletteItemSchema, PaletteGroupsSchema, PaletteGroupSchema, NodesSchema, NodeSchema, ProjectAnimationSchema, ProjectInterpolationType, ProjectChannelSchema } from './schema-v3';
export { VoxelsSchema, VoxelSchema, PaletteDataSchema, PaletteItemsSchema, PaletteItemSchema, PaletteGroupsSchema, PaletteGroupSchema, NodeSchema, NodesSchema, ProjectAnimationSchema, ProjectInterpolationType, ProjectChannelSchema, };
export declare const ProjectDataV4Schema: MuStruct<{
    version: MuVarint;
    nodes: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
        id: import("@box-local/mudb/schema").MuASCII;
        type: import("@box-local/mudb/schema").MuSchema<import("..").ProjectNodeType>;
        name: import("@box-local/mudb/schema").MuUTF8;
        voxelId: import("@box-local/mudb/schema").MuASCII;
        parentId: import("@box-local/mudb/schema").MuASCII;
        childrenIds: MuArray<import("@box-local/mudb/schema").MuASCII>;
        alpha: import("@box-local/mudb/schema").MuFloat32;
        pivot: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        position: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        quaternion: import("@box-local/mudb/schema").MuVector<"float32", 4>;
        euler: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        flip: import("@box-local/mudb/schema").MuVector<"uint8", 3>;
    }>>;
    voxels: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
        id: import("@box-local/mudb/schema").MuASCII;
        encodedView: MuArray<MuVarint>;
    }>>;
    palette: MuStruct<{
        items: MuArray<MuStruct<{
            id: MuVarint;
            rgb: import("@box-local/mudb/schema").MuVector<"uint8", 3>;
            hsv: import("@box-local/mudb/schema").MuVector<"uint16", 3>;
            material: MuStruct<{
                emissive: import("@box-local/mudb/schema").MuFloat32;
            }>;
        }>>;
        groups: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            id: import("@box-local/mudb/schema").MuASCII;
            name: import("@box-local/mudb/schema").MuUTF8;
            itemIds: MuArray<import("@box-local/mudb/schema").MuUint16>;
        }>>;
        groupList: MuArray<import("@box-local/mudb/schema").MuASCII>;
    }>;
    animations: MuArray<MuStruct<{
        name: import("@box-local/mudb/schema").MuUTF8;
        channels: MuArray<MuStruct<{
            target: MuStruct<{
                nodeId: import("@box-local/mudb/schema").MuASCII;
                path: import("@box-local/mudb/schema").MuSchema<import("./schema-v3").ChannelNodePath>;
            }>;
            sampler: MuStruct<{
                input: MuArray<import("@box-local/mudb/schema").MuFloat32>;
                output: import("@box-local/mudb/schema").MuUnion<{
                    rotation: MuArray<import("@box-local/mudb/schema").MuVector<"float32", 4>>;
                    translation: MuArray<import("@box-local/mudb/schema").MuVector<"float32", 3>>;
                    alpha: MuArray<import("@box-local/mudb/schema").MuFloat32>;
                    scale: MuArray<import("@box-local/mudb/schema").MuVector<"float32", 3>>;
                }>;
                interpolation: import("@box-local/mudb/schema").MuSchema<ProjectInterpolationType>;
            }>;
        }>>;
    }>>;
}>;
export type ProjectDataV4 = typeof ProjectDataV4Schema.identity;
