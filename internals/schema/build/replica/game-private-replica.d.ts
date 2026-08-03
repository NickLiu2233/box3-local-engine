import { MuBoolean, MuSortedArray, MuStruct, MuUTF8, MuVarint } from '@box-local/mudb/schema';
import { Gamepad } from '../api/js/api';
export declare const PlayerGamepadSchema: MuStruct<{
    [K in keyof Gamepad]: MuUTF8;
}>;
export type PlayerGamepad = typeof PlayerGamepadSchema['identity'];
export declare const GamePrivateReplicaSchema: MuStruct<{
    id: MuVarint;
    colorLUT: import("@box-local/mudb/schema").MuASCII;
    enableCursor: MuBoolean;
    music: MuStruct<{
        sampleId: MuVarint;
        radius: import("@box-local/mudb/schema").MuQuantizedFloat;
        gain: import("@box-local/mudb/schema").MuQuantizedFloat;
        gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
        pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
        pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
    }>;
    camera: MuStruct<{
        mode: import("@box-local/mudb/schema").MuSchema<import("../camera/camera-schema").CameraMode>;
        targetId: MuVarint;
        eye: import("../utils/quantized-schema").QuantizedVec3Schema;
        up: import("../utils/quantized-schema").QuantizedVec3Schema;
        target: import("../utils/quantized-schema").QuantizedVec3Schema;
        freezedAxis: import("@box-local/mudb/schema").MuUint8;
        fovY: import("../utils/quantized-schema").QuantizedScalar;
        distance: import("../utils/quantized-schema").QuantizedScalar;
    }>;
    gamepad: MuStruct<{
        joystickBackground: MuUTF8;
        joystickController: MuUTF8;
        flyButton: MuUTF8;
        flyingBackground: MuUTF8;
        flyingController: MuUTF8;
        jump: MuUTF8;
        crouch: MuUTF8;
        actionA: MuUTF8;
        actionB: MuUTF8;
    }>;
}>;
export type GamePrivateReplica = typeof GamePrivateReplicaSchema.identity;
export declare const GamePrivateReplicaSetSchema: MuSortedArray<MuStruct<{
    id: MuVarint;
    colorLUT: import("@box-local/mudb/schema").MuASCII;
    enableCursor: MuBoolean;
    music: MuStruct<{
        sampleId: MuVarint;
        radius: import("@box-local/mudb/schema").MuQuantizedFloat;
        gain: import("@box-local/mudb/schema").MuQuantizedFloat;
        gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
        pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
        pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
    }>;
    camera: MuStruct<{
        mode: import("@box-local/mudb/schema").MuSchema<import("../camera/camera-schema").CameraMode>;
        targetId: MuVarint;
        eye: import("../utils/quantized-schema").QuantizedVec3Schema;
        up: import("../utils/quantized-schema").QuantizedVec3Schema;
        target: import("../utils/quantized-schema").QuantizedVec3Schema;
        freezedAxis: import("@box-local/mudb/schema").MuUint8;
        fovY: import("../utils/quantized-schema").QuantizedScalar;
        distance: import("../utils/quantized-schema").QuantizedScalar;
    }>;
    gamepad: MuStruct<{
        joystickBackground: MuUTF8;
        joystickController: MuUTF8;
        flyButton: MuUTF8;
        flyingBackground: MuUTF8;
        flyingController: MuUTF8;
        jump: MuUTF8;
        crouch: MuUTF8;
        actionA: MuUTF8;
        actionB: MuUTF8;
    }>;
}>>;
//# sourceMappingURL=game-private-replica.d.ts.map