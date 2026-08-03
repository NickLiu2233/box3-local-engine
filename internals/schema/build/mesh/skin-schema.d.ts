import { MuStruct, MuUint8, MuSchema } from '@box-local/mudb/schema';
import { BodyPart } from '../player/player-schema';
export declare const PlayerSkinPartSchema: MuStruct<{
    partId: MuSchema<BodyPart>;
    bindMat: MuSchema<import("gl-matrix").mat4>;
    mesh: import("@box-local/mudb/schema").MuArray<MuStruct<{
        vertices: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        sizes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        uvs: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        uvFlags: import("@box-local/mudb/schema").MuArray<MuUint8>;
    }>>;
    texture: MuStruct<{
        palette: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUint32>;
        data: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        width: import("@box-local/mudb/schema").MuVarint;
    }>;
}>;
//# sourceMappingURL=skin-schema.d.ts.map