import { MuStruct, MuVarint, MuArray } from '@box-local/mudb/schema';
export declare const ScriptNetInputSchema: MuStruct<{
    tick: import("@box-local/mudb/schema").MuQuantizedFloat;
    position: import("../utils/quantized-schema").QuantizedVec3Schema;
    rayTime: import("@box-local/mudb/schema").MuQuantizedFloat;
    rayHitEntity: MuVarint;
    rayHitVoxelX: MuVarint;
    rayHitVoxelY: MuVarint;
    rayHitVoxelZ: MuVarint;
    rayHitNormal: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec3>;
    rayOrigin: import("../utils/quantized-schema").QuantizedVec3Schema;
    rayDirection: import("../utils/quantized-schema").QuantizedVec3Schema;
    buttonState: import("@box-local/mudb/schema").MuSchema<import("../net/net-schema").NetInputEventBits>;
    prevButtonState: import("@box-local/mudb/schema").MuSchema<import("../net/net-schema").NetInputEventBits>;
    id: MuVarint;
}>;
export type ScriptNetInput = typeof ScriptNetInputSchema;
export declare const ScriptNetInputSetSchema: MuArray<MuStruct<{
    tick: import("@box-local/mudb/schema").MuQuantizedFloat;
    position: import("../utils/quantized-schema").QuantizedVec3Schema;
    rayTime: import("@box-local/mudb/schema").MuQuantizedFloat;
    rayHitEntity: MuVarint;
    rayHitVoxelX: MuVarint;
    rayHitVoxelY: MuVarint;
    rayHitVoxelZ: MuVarint;
    rayHitNormal: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec3>;
    rayOrigin: import("../utils/quantized-schema").QuantizedVec3Schema;
    rayDirection: import("../utils/quantized-schema").QuantizedVec3Schema;
    buttonState: import("@box-local/mudb/schema").MuSchema<import("../net/net-schema").NetInputEventBits>;
    prevButtonState: import("@box-local/mudb/schema").MuSchema<import("../net/net-schema").NetInputEventBits>;
    id: MuVarint;
}>>;
//# sourceMappingURL=net-events.d.ts.map