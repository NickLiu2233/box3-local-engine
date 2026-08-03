import { MuStruct, MuArray, MuUTF8, MuSchema } from '@box-local/mudb/schema';
export declare const ServerEventSchema: MuStruct<{
    voxel: MuStruct<{
        voxelChange: MuArray<MuStruct<{
            x: import("@box-local/mudb/schema").MuUint32;
            y: import("@box-local/mudb/schema").MuUint32;
            z: import("@box-local/mudb/schema").MuUint32;
            b: import("@box-local/mudb/schema").MuUint16;
            p: import("@box-local/mudb/schema").MuUint16;
        }>>;
        voxelReset: import("@box-local/mudb/schema").MuBoolean;
    }>;
    chat: MuStruct<{
        chats: MuArray<MuStruct<{
            senderId: import("@box-local/mudb/schema").MuInt32;
            targetId: import("@box-local/mudb/schema").MuInt32;
            name: MuUTF8;
            msgType: MuSchema<import("../chat/chat-schema").MsgType>;
            message: MuUTF8;
            private: import("@box-local/mudb/schema").MuBoolean;
            duration: import("@box-local/mudb/schema").MuInt32;
        }>>;
    }>;
    physics: MuStruct<{
        bodyContact: MuArray<MuStruct<{
            otherId: import("@box-local/mudb/schema").MuVarint;
            nx: import("@box-local/mudb/schema").MuFloat32;
            ny: import("@box-local/mudb/schema").MuFloat32;
            nz: import("@box-local/mudb/schema").MuFloat32;
            fx: import("@box-local/mudb/schema").MuFloat32;
            fy: import("@box-local/mudb/schema").MuFloat32;
            fz: import("@box-local/mudb/schema").MuFloat32;
            id: import("@box-local/mudb/schema").MuVarint;
            tick: import("@box-local/mudb/schema").MuVarint;
        }>>;
        voxelContact: MuArray<MuStruct<{
            x: import("@box-local/mudb/schema").MuVarint;
            y: import("@box-local/mudb/schema").MuVarint;
            z: import("@box-local/mudb/schema").MuVarint;
            b: import("@box-local/mudb/schema").MuVarint;
            axis: import("@box-local/mudb/schema").MuInt8;
            fx: import("@box-local/mudb/schema").MuFloat32;
            fy: import("@box-local/mudb/schema").MuFloat32;
            fz: import("@box-local/mudb/schema").MuFloat32;
            id: import("@box-local/mudb/schema").MuVarint;
            tick: import("@box-local/mudb/schema").MuVarint;
        }>>;
        fluidContact: MuArray<MuStruct<{
            b: import("@box-local/mudb/schema").MuVarint;
            volumeFraction: import("@box-local/mudb/schema").MuQuantizedFloat;
            id: import("@box-local/mudb/schema").MuVarint;
            tick: import("@box-local/mudb/schema").MuVarint;
        }>>;
        bodySeparate: MuArray<MuStruct<{
            otherId: import("@box-local/mudb/schema").MuVarint;
            nx: import("@box-local/mudb/schema").MuFloat32;
            ny: import("@box-local/mudb/schema").MuFloat32;
            nz: import("@box-local/mudb/schema").MuFloat32;
            fx: import("@box-local/mudb/schema").MuFloat32;
            fy: import("@box-local/mudb/schema").MuFloat32;
            fz: import("@box-local/mudb/schema").MuFloat32;
            id: import("@box-local/mudb/schema").MuVarint;
            tick: import("@box-local/mudb/schema").MuVarint;
        }>>;
        voxelSeparate: MuArray<MuStruct<{
            x: import("@box-local/mudb/schema").MuVarint;
            y: import("@box-local/mudb/schema").MuVarint;
            z: import("@box-local/mudb/schema").MuVarint;
            b: import("@box-local/mudb/schema").MuVarint;
            axis: import("@box-local/mudb/schema").MuInt8;
            fx: import("@box-local/mudb/schema").MuFloat32;
            fy: import("@box-local/mudb/schema").MuFloat32;
            fz: import("@box-local/mudb/schema").MuFloat32;
            id: import("@box-local/mudb/schema").MuVarint;
            tick: import("@box-local/mudb/schema").MuVarint;
        }>>;
        fluidSeparate: MuArray<MuStruct<{
            b: import("@box-local/mudb/schema").MuVarint;
            volumeFraction: import("@box-local/mudb/schema").MuQuantizedFloat;
            id: import("@box-local/mudb/schema").MuVarint;
            tick: import("@box-local/mudb/schema").MuVarint;
        }>>;
    }>;
    net: MuArray<MuStruct<{
        tick: import("@box-local/mudb/schema").MuQuantizedFloat;
        position: import("../utils/quantized-schema").QuantizedVec3Schema;
        rayTime: import("@box-local/mudb/schema").MuQuantizedFloat;
        rayHitEntity: import("@box-local/mudb/schema").MuVarint;
        rayHitVoxelX: import("@box-local/mudb/schema").MuVarint;
        rayHitVoxelY: import("@box-local/mudb/schema").MuVarint;
        rayHitVoxelZ: import("@box-local/mudb/schema").MuVarint;
        rayHitNormal: MuSchema<import("gl-matrix").vec3>;
        rayOrigin: import("../utils/quantized-schema").QuantizedVec3Schema;
        rayDirection: import("../utils/quantized-schema").QuantizedVec3Schema;
        buttonState: MuSchema<import("../net/net-schema").NetInputEventBits>;
        prevButtonState: MuSchema<import("../net/net-schema").NetInputEventBits>;
        id: import("@box-local/mudb/schema").MuVarint;
    }>>;
    connect: MuArray<MuSchema<string>>;
    join: MuArray<MuSchema<string>>;
    disconnect: MuArray<MuSchema<string>>;
    keyboard: MuArray<MuStruct<{
        id: import("@box-local/mudb/schema").MuVarint;
        tick: import("@box-local/mudb/schema").MuVarint;
        keyDownState: MuArray<import("@box-local/mudb/schema").MuUint8>;
        prevKeyDownState: MuArray<import("@box-local/mudb/schema").MuUint8>;
    }>>;
}>;
//# sourceMappingURL=server-event-schema.d.ts.map