import { ModelDataV1 } from './schema-v1';
import { ModelDataV2 } from './schema-v2';
import { ModelDataV3 } from './schema-v3';
import { ModelDataV4 } from './schema-v4';
import { ModelDataV5 } from './schema-v5';
import { ModelDataV6 } from './schema-v6';
import { ModelDataV7 } from './schema-v7';
export type ModelData = ModelDataV7;
export type ModelDataTypes = ModelDataV1 | ModelDataV2 | ModelDataV3 | ModelDataV4 | ModelDataV5 | ModelDataV6 | ModelDataV7;
export declare const VOXA_MODEL_VERSION = 7;
export declare const MODEL_SCHEMA: {
    1: import("@box-local/mudb/schema").MuStruct<{
        bounds: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        meshes: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUint8>>;
    }>;
    2: import("@box-local/mudb/schema").MuStruct<{
        version: import("@box-local/mudb/schema").MuVarint;
        bounds: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        nodes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
            mesh: import("@box-local/mudb/schema").MuInt32;
            rotation: import("@box-local/mudb/schema").MuVector<"float32", 4>;
            translation: import("@box-local/mudb/schema").MuVector<"float32", 3>;
            children: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            alpha: import("@box-local/mudb/schema").MuFloat32;
        }>>;
        meshes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUint8>>;
    }>;
    3: import("@box-local/mudb/schema").MuStruct<{
        version: import("@box-local/mudb/schema").MuVarint;
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
    4: import("@box-local/mudb/schema").MuStruct<{
        version: import("@box-local/mudb/schema").MuVarint;
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
    5: import("@box-local/mudb/schema").MuStruct<{
        version: import("@box-local/mudb/schema").MuVarint;
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
        animations: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuASCII;
            name: import("@box-local/mudb/schema").MuUTF8;
            channels: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                sampler: import("@box-local/mudb/schema").MuVarint;
                target: import("@box-local/mudb/schema").MuStruct<{
                    node: import("@box-local/mudb/schema").MuVarint;
                    path: import("@box-local/mudb/schema").MuSchema<import("..").ChannelNodePath>;
                }>;
            }>>;
            samplers: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                input: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat32>;
                output: import("@box-local/mudb/schema").MuUnion<{
                    rotation: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVector<"float32", 4>>;
                    translation: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVector<"float32", 3>>;
                    alpha: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat32>;
                    scale: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVector<"float32", 3>>;
                }>;
                interpolation: import("@box-local/mudb/schema").MuSchema<import("..").ProjectInterpolationType>;
            }>>;
        }>>;
    }>;
    6: import("@box-local/mudb/schema").MuStruct<{
        version: import("@box-local/mudb/schema").MuVarint;
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
        animations: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuASCII;
            name: import("@box-local/mudb/schema").MuUTF8;
            channels: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                sampler: import("@box-local/mudb/schema").MuVarint;
                target: import("@box-local/mudb/schema").MuStruct<{
                    node: import("@box-local/mudb/schema").MuVarint;
                    path: import("@box-local/mudb/schema").MuSchema<import("..").ChannelNodePath>;
                }>;
            }>>;
            samplers: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                input: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat32>;
                output: import("@box-local/mudb/schema").MuUnion<{
                    rotation: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVector<"float32", 4>>;
                    translation: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVector<"float32", 3>>;
                    alpha: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat32>;
                    scale: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVector<"float32", 3>>;
                }>;
                interpolation: import("@box-local/mudb/schema").MuSchema<import("..").ProjectInterpolationType>;
            }>>;
        }>>;
    }>;
    7: import("@box-local/mudb/schema").MuStruct<{
        version: import("@box-local/mudb/schema").MuVarint;
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
        animations: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuASCII;
            name: import("@box-local/mudb/schema").MuUTF8;
            channels: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                sampler: import("@box-local/mudb/schema").MuVarint;
                target: import("@box-local/mudb/schema").MuStruct<{
                    node: import("@box-local/mudb/schema").MuVarint;
                    path: import("@box-local/mudb/schema").MuSchema<import("..").ChannelNodePath>;
                }>;
            }>>;
            samplers: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                input: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat32>;
                output: import("@box-local/mudb/schema").MuUnion<{
                    rotation: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVector<"float32", 4>>;
                    translation: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVector<"float32", 3>>;
                    alpha: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat32>;
                    scale: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVector<"float32", 3>>;
                }>;
                interpolation: import("@box-local/mudb/schema").MuSchema<import("..").ProjectInterpolationType>;
            }>>;
        }>>;
    }>;
};
