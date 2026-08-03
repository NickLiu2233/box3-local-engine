import { MuArray, MuOption, MuStruct, MuVarint } from '@box-local/mudb/schema';
export declare const ModelPivotSchema: import("@box-local/mudb/schema").MuVector<"float32", 3>;
export { PaletteDataSchema, PaletteItemsSchema, PaletteItemSchema, PaletteGroupsSchema, PaletteGroupSchema, ProjectInterpolationType, KeyframeOffsetSchema, KeyframeSchema, KeyframeListSchema, MotionNodeSchema, MotionNodesSchema, ProjectAnimationSchema, NodeSchema, NodesSchema, VoxelsSchema, VoxelSchema, HitBoxSchema, HitBoxDataSchema, } from './schema-v9';
export declare const ProjectDataV10Schema: MuStruct<{
    version: MuVarint;
    nodes: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
        id: import("@box-local/mudb/schema").MuASCII;
        type: import("@box-local/mudb/schema").MuSchema<import("../util").ProjectNodeType>;
        name: import("@box-local/mudb/schema").MuUTF8;
        voxelId: import("@box-local/mudb/schema").MuASCII;
        parentId: import("@box-local/mudb/schema").MuASCII;
        childrenIds: MuArray<import("@box-local/mudb/schema").MuASCII>;
        skinId: import("@box-local/mudb/schema").MuASCII;
        boneId: import("@box-local/mudb/schema").MuASCII;
        alpha: import("@box-local/mudb/schema").MuFloat32;
        pivot: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        position: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        quaternion: import("@box-local/mudb/schema").MuVector<"float32", 4>;
        euler: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        flip: import("@box-local/mudb/schema").MuVector<"uint8", 3>;
        scale: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        parentScaleMat3: import("@box-local/mudb/schema").MuVector<"float32", 9>;
    }>>;
    voxels: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
        id: import("@box-local/mudb/schema").MuASCII;
        dimension: import("@box-local/mudb/schema").MuSchema<import("../util").VoxelDimension>;
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
        id: import("@box-local/mudb/schema").MuASCII;
        name: import("@box-local/mudb/schema").MuUTF8;
        nodes: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            nodeId: import("@box-local/mudb/schema").MuASCII;
            keyframeList: MuArray<MuStruct<{
                time: import("@box-local/mudb/schema").MuASCII;
                interpolation: import("@box-local/mudb/schema").MuSchema<import("./schema-v9").ProjectInterpolationType>;
                offset: MuStruct<{
                    translation: MuOption<import("@box-local/mudb/schema").MuVector<"float32", 3>>;
                    rotation: MuOption<import("@box-local/mudb/schema").MuVector<"float32", 4>>;
                    scale: MuOption<import("@box-local/mudb/schema").MuVector<"float32", 3>>;
                    alpha: MuOption<import("@box-local/mudb/schema").MuFloat32>;
                }>;
            }>>;
        }>>;
    }>>;
    hitBox: MuStruct<{
        mode: import("@box-local/mudb/schema").MuSchema<import("../util").HitBoxMode>;
        customBox: MuOption<MuStruct<{
            position: import("@box-local/mudb/schema").MuVector<"float32", 3>;
            size: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        }>>;
    }>;
    modelPivot: MuOption<import("@box-local/mudb/schema").MuVector<"float32", 3>>;
}>;
export type ProjectDataV10 = typeof ProjectDataV10Schema.identity;
