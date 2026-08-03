import { ModelData, ModelDataTypes } from '../def';
export declare function migrate(bytes: Uint8Array): Promise<ModelData | undefined>;
export declare const getVersion: (data: ModelDataTypes) => number;
export declare const isLatest: (data: ModelDataTypes) => data is ModelData;
export declare function modelBytesToSchema(bytes: Uint8Array): {
    version: number;
    schema: import("@box-local/mudb/schema/struct").Struct<{
        bounds: import("@box-local/mudb/schema").MuVector<"float32", 3>;
        meshes: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUint8>>;
    }>;
} | {
    version: 4 | 3 | 1 | 2 | 5 | 7 | 6;
    schema: ModelDataTypes;
} | undefined;
export declare function modelSchemaToBytes(value: ModelDataTypes): Uint8Array;
