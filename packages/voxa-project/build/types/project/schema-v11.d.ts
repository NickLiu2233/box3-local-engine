import { MuASCII, MuOption, MuStruct, MuUTF8, MuVarint } from '@box/mudb/schema';
export * from './schema-v10';
export declare const PreviewExportSchema: MuStruct<{
    projectId: MuASCII;
    author: MuUTF8;
    description: MuUTF8;
    version: MuUTF8;
    defaultAnimationId: MuOption<MuASCII>;
    lastExportedVersion: MuUTF8;
}>;
export declare const ProjectDataV11Schema: MuStruct<{
    version: MuVarint;
    previewExport: MuOption<MuStruct<{
        projectId: MuASCII;
        author: MuUTF8;
        description: MuUTF8;
        version: MuUTF8;
        defaultAnimationId: MuOption<MuASCII>;
        lastExportedVersion: MuUTF8;
    }>>;
    nodes: import("@box/mudb/schema").MuDictionary<MuStruct<{
        id: MuASCII;
        type: import("@box/mudb/schema").MuSchema<import("..").ProjectNodeType>;
        name: MuUTF8;
        voxelId: MuASCII;
        parentId: MuASCII;
        childrenIds: import("@box/mudb/schema").MuArray<MuASCII>;
        skinId: MuASCII;
        boneId: MuASCII;
        alpha: import("@box/mudb/schema").MuFloat32;
        pivot: import("@box/mudb/schema").MuVector<"float32", 3>;
        position: import("@box/mudb/schema").MuVector<"float32", 3>;
        quaternion: import("@box/mudb/schema").MuVector<"float32", 4>;
        euler: import("@box/mudb/schema").MuVector<"float32", 3>;
        flip: import("@box/mudb/schema").MuVector<"uint8", 3>;
        scale: import("@box/mudb/schema").MuVector<"float32", 3>;
        parentScaleMat3: import("@box/mudb/schema").MuVector<"float32", 9>;
    }>>;
    voxels: import("@box/mudb/schema").MuDictionary<MuStruct<{
        id: MuASCII;
        dimension: import("@box/mudb/schema").MuSchema<import("..").VoxelDimension>;
        encodedView: import("@box/mudb/schema").MuArray<MuVarint>;
    }>>;
    palette: MuStruct<{
        items: import("@box/mudb/schema").MuArray<MuStruct<{
            id: MuVarint;
            rgb: import("@box/mudb/schema").MuVector<"uint8", 3>;
            hsv: import("@box/mudb/schema").MuVector<"uint16", 3>;
            material: MuStruct<{
                emissive: import("@box/mudb/schema").MuFloat32;
            }>;
        }>>;
        groups: import("@box/mudb/schema").MuDictionary<MuStruct<{
            id: MuASCII;
            name: MuUTF8;
            itemIds: import("@box/mudb/schema").MuArray<import("@box/mudb/schema").MuUint16>;
        }>>;
        groupList: import("@box/mudb/schema").MuArray<MuASCII>;
    }>;
    animations: import("@box/mudb/schema").MuArray<MuStruct<{
        id: MuASCII;
        name: MuUTF8;
        nodes: import("@box/mudb/schema").MuDictionary<MuStruct<{
            nodeId: MuASCII;
            keyframeList: import("@box/mudb/schema").MuArray<MuStruct<{
                time: MuASCII;
                interpolation: import("@box/mudb/schema").MuSchema<import("./schema-v10").ProjectInterpolationType>;
                offset: MuStruct<{
                    translation: MuOption<import("@box/mudb/schema").MuVector<"float32", 3>>;
                    rotation: MuOption<import("@box/mudb/schema").MuVector<"float32", 4>>;
                    scale: MuOption<import("@box/mudb/schema").MuVector<"float32", 3>>;
                    alpha: MuOption<import("@box/mudb/schema").MuFloat32>;
                }>;
            }>>;
        }>>;
    }>>;
    hitBox: MuStruct<{
        mode: import("@box/mudb/schema").MuSchema<import("..").HitBoxMode>;
        customBox: MuOption<MuStruct<{
            position: import("@box/mudb/schema").MuVector<"float32", 3>;
            size: import("@box/mudb/schema").MuVector<"float32", 3>;
        }>>;
    }>;
    modelPivot: MuOption<import("@box/mudb/schema").MuVector<"float32", 3>>;
}>;
export type ProjectDataV11 = typeof ProjectDataV11Schema.identity;
