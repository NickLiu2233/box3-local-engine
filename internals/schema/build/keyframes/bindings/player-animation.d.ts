import { GamePlayerKeyframe } from '../../api/js/api';
import { CameraMode } from '../../camera/camera-schema';
import { PlayerDisplayFlags } from '../../player/player-schema';
export declare const PLAYER_ANIM_BINDING: import("../keyframe-binding").AnimationBinding<GamePlayerKeyframe, import("@box-local/mudb/schema").MuStruct<{
    id: import("@box-local/mudb/schema").MuVarint;
    targetId: import("@box-local/mudb/schema").MuVarint;
    startTick: import("@box-local/mudb/schema").MuQuantizedFloat;
    endTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
    cycleTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
    cyclePhase: import("@box-local/mudb/schema").MuQuantizedFloat;
    cycleCount: import("@box-local/mudb/schema").MuQuantizedFloat;
    playbackMode: import("@box-local/mudb/schema").MuSchema<import("../type").AnimationPlaybackMode>;
    keyframes: import("@box-local/mudb/schema").MuSortedArray<import("@box-local/mudb/schema").MuStruct<{
        tick: import("@box-local/mudb/schema").MuQuantizedFloat;
        easeIn: import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>;
        easeOut: import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>;
        components: import("../mu-array-union").MuArrayUnion<[import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuStruct<{
            r: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            g: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            b: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuASCII]>]>;
    }>>;
}>, import("@box-local/mudb/schema").MuStruct<{
    dirty: import("@box-local/mudb/schema").MuBoolean;
    tracker: import("@box-local/mudb/schema").MuStruct<{
        targetId: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        wrapMode: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").AnimationPlaybackMode>>;
        cycleLength: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
        loopCount: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
        loopPhase: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
        tickOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuQuantizedFloat>;
        tickScale: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
        dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        data: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
        inEasing: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>>;
        outEasing: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>>;
        prevFrame: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        nextFrame: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        prevWeight: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
        nextWeight: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
    }>;
    components: import("@box-local/mudb/schema").MuStruct<{
        skin: import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
        }>;
    } & {
        replica: import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
        }>;
    }>;
}>, {
    skin: (index: import("@box-local/mudb/schema/struct").Struct<{
        dirty: import("@box-local/mudb/schema").MuBoolean;
        tracker: import("@box-local/mudb/schema").MuStruct<{
            targetId: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            wrapMode: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").AnimationPlaybackMode>>;
            cycleLength: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            loopCount: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            loopPhase: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            tickOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuQuantizedFloat>;
            tickScale: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            data: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            inEasing: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>>;
            outEasing: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>>;
            prevFrame: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            nextFrame: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            prevWeight: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            nextWeight: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
        }>;
        components: import("@box-local/mudb/schema").MuStruct<{
            skin: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            replica: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, components: import("@box-local/mudb/schema/struct").Struct<{
        id: import("@box-local/mudb/schema").MuVarint;
        flags: import("@box-local/mudb/schema").MuSchema<PlayerDisplayFlags>;
        name: import("@box-local/mudb/schema").MuUTF8;
        tag: import("@box-local/mudb/schema").MuVarint;
        avatarSkin: import("@box-local/mudb/schema").MuStruct<{
            hips: import("@box-local/mudb/schema").MuVarint;
            torso: import("@box-local/mudb/schema").MuVarint;
            neck: import("@box-local/mudb/schema").MuVarint;
            head: import("@box-local/mudb/schema").MuVarint;
            leftShoulder: import("@box-local/mudb/schema").MuVarint;
            leftUpperArm: import("@box-local/mudb/schema").MuVarint;
            leftLowerArm: import("@box-local/mudb/schema").MuVarint;
            leftHand: import("@box-local/mudb/schema").MuVarint;
            rightShoulder: import("@box-local/mudb/schema").MuVarint;
            rightUpperArm: import("@box-local/mudb/schema").MuVarint;
            rightLowerArm: import("@box-local/mudb/schema").MuVarint;
            rightHand: import("@box-local/mudb/schema").MuVarint;
            leftUpperLeg: import("@box-local/mudb/schema").MuVarint;
            leftLowerLeg: import("@box-local/mudb/schema").MuVarint;
            leftFoot: import("@box-local/mudb/schema").MuVarint;
            rightUpperLeg: import("@box-local/mudb/schema").MuVarint;
            rightLowerLeg: import("@box-local/mudb/schema").MuVarint;
            rightFoot: import("@box-local/mudb/schema").MuVarint;
        }>;
        userId: import("@box-local/mudb/schema").MuUTF8;
        avatar_hash: import("@box-local/mudb/schema").MuASCII;
        skinInvisible: import("@box-local/mudb/schema").MuStruct<{
            hips: import("@box-local/mudb/schema").MuBoolean;
            torso: import("@box-local/mudb/schema").MuBoolean;
            neck: import("@box-local/mudb/schema").MuBoolean;
            head: import("@box-local/mudb/schema").MuBoolean;
            leftShoulder: import("@box-local/mudb/schema").MuBoolean;
            leftUpperArm: import("@box-local/mudb/schema").MuBoolean;
            leftLowerArm: import("@box-local/mudb/schema").MuBoolean;
            leftHand: import("@box-local/mudb/schema").MuBoolean;
            rightShoulder: import("@box-local/mudb/schema").MuBoolean;
            rightUpperArm: import("@box-local/mudb/schema").MuBoolean;
            rightLowerArm: import("@box-local/mudb/schema").MuBoolean;
            rightHand: import("@box-local/mudb/schema").MuBoolean;
            leftUpperLeg: import("@box-local/mudb/schema").MuBoolean;
            leftLowerLeg: import("@box-local/mudb/schema").MuBoolean;
            leftFoot: import("@box-local/mudb/schema").MuBoolean;
            rightUpperLeg: import("@box-local/mudb/schema").MuBoolean;
            rightLowerLeg: import("@box-local/mudb/schema").MuBoolean;
            rightFoot: import("@box-local/mudb/schema").MuBoolean;
        }>;
        mapSkin: import("@box-local/mudb/schema").MuStruct<{
            hips: import("@box-local/mudb/schema").MuVarint;
            torso: import("@box-local/mudb/schema").MuVarint;
            neck: import("@box-local/mudb/schema").MuVarint;
            head: import("@box-local/mudb/schema").MuVarint;
            leftShoulder: import("@box-local/mudb/schema").MuVarint;
            leftUpperArm: import("@box-local/mudb/schema").MuVarint;
            leftLowerArm: import("@box-local/mudb/schema").MuVarint;
            leftHand: import("@box-local/mudb/schema").MuVarint;
            rightShoulder: import("@box-local/mudb/schema").MuVarint;
            rightUpperArm: import("@box-local/mudb/schema").MuVarint;
            rightLowerArm: import("@box-local/mudb/schema").MuVarint;
            rightHand: import("@box-local/mudb/schema").MuVarint;
            leftUpperLeg: import("@box-local/mudb/schema").MuVarint;
            leftLowerLeg: import("@box-local/mudb/schema").MuVarint;
            leftFoot: import("@box-local/mudb/schema").MuVarint;
            rightUpperLeg: import("@box-local/mudb/schema").MuVarint;
            rightLowerLeg: import("@box-local/mudb/schema").MuVarint;
            rightFoot: import("@box-local/mudb/schema").MuVarint;
        }>;
        color: import("../../utils/quantized-schema").QuantizedVec3Schema;
        metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
        emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
        shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
        scale: import("@box-local/mudb/schema").MuQuantizedFloat;
        attachments: import("@box-local/mudb/schema").MuStruct<{
            hips: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            torso: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            neck: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            head: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftShoulder: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftUpperArm: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftLowerArm: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftHand: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightShoulder: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightUpperArm: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightLowerArm: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightHand: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftUpperLeg: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftLowerLeg: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftFoot: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightUpperLeg: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightLowerLeg: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightFoot: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
        }>;
    }>[]) => void;
} & {
    replica: (index: import("@box-local/mudb/schema/struct").Struct<{
        dirty: import("@box-local/mudb/schema").MuBoolean;
        tracker: import("@box-local/mudb/schema").MuStruct<{
            targetId: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            wrapMode: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").AnimationPlaybackMode>>;
            cycleLength: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            loopCount: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            loopPhase: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            tickOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuQuantizedFloat>;
            tickScale: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            data: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            inEasing: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>>;
            outEasing: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>>;
            prevFrame: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            nextFrame: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            prevWeight: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            nextWeight: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
        }>;
        components: import("@box-local/mudb/schema").MuStruct<{
            skin: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            replica: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, components: import("@box-local/mudb/schema/struct").Struct<{
        id: import("@box-local/mudb/schema").MuVarint;
        colorLUT: import("@box-local/mudb/schema").MuASCII;
        enableCursor: import("@box-local/mudb/schema").MuBoolean;
        music: import("@box-local/mudb/schema").MuStruct<{
            sampleId: import("@box-local/mudb/schema").MuVarint;
            radius: import("@box-local/mudb/schema").MuQuantizedFloat;
            gain: import("@box-local/mudb/schema").MuQuantizedFloat;
            gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
            pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>;
        camera: import("@box-local/mudb/schema").MuStruct<{
            mode: import("@box-local/mudb/schema").MuSchema<CameraMode>;
            targetId: import("@box-local/mudb/schema").MuVarint;
            eye: import("../../utils/quantized-schema").QuantizedVec3Schema;
            up: import("../../utils/quantized-schema").QuantizedVec3Schema;
            target: import("../../utils/quantized-schema").QuantizedVec3Schema;
            freezedAxis: import("@box-local/mudb/schema").MuUint8;
            fovY: import("../../utils/quantized-schema").QuantizedScalar;
            distance: import("../../utils/quantized-schema").QuantizedScalar;
        }>;
        gamepad: import("@box-local/mudb/schema").MuStruct<{
            joystickBackground: import("@box-local/mudb/schema").MuUTF8;
            joystickController: import("@box-local/mudb/schema").MuUTF8;
            flyButton: import("@box-local/mudb/schema").MuUTF8;
            flyingBackground: import("@box-local/mudb/schema").MuUTF8;
            flyingController: import("@box-local/mudb/schema").MuUTF8;
            jump: import("@box-local/mudb/schema").MuUTF8;
            crouch: import("@box-local/mudb/schema").MuUTF8;
            actionA: import("@box-local/mudb/schema").MuUTF8;
            actionB: import("@box-local/mudb/schema").MuUTF8;
        }>;
    }>[]) => void;
}, {
    skin: (index: import("@box-local/mudb/schema/struct").Struct<{
        dirty: import("@box-local/mudb/schema").MuBoolean;
        tracker: import("@box-local/mudb/schema").MuStruct<{
            targetId: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            wrapMode: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").AnimationPlaybackMode>>;
            cycleLength: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            loopCount: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            loopPhase: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            tickOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuQuantizedFloat>;
            tickScale: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            data: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            inEasing: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>>;
            outEasing: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>>;
            prevFrame: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            nextFrame: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            prevWeight: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            nextWeight: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
        }>;
        components: import("@box-local/mudb/schema").MuStruct<{
            skin: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            replica: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, dst: import("@box-local/mudb/schema/struct").Struct<{
        id: import("@box-local/mudb/schema").MuVarint;
        flags: import("@box-local/mudb/schema").MuSchema<PlayerDisplayFlags>;
        name: import("@box-local/mudb/schema").MuUTF8;
        tag: import("@box-local/mudb/schema").MuVarint;
        avatarSkin: import("@box-local/mudb/schema").MuStruct<{
            hips: import("@box-local/mudb/schema").MuVarint;
            torso: import("@box-local/mudb/schema").MuVarint;
            neck: import("@box-local/mudb/schema").MuVarint;
            head: import("@box-local/mudb/schema").MuVarint;
            leftShoulder: import("@box-local/mudb/schema").MuVarint;
            leftUpperArm: import("@box-local/mudb/schema").MuVarint;
            leftLowerArm: import("@box-local/mudb/schema").MuVarint;
            leftHand: import("@box-local/mudb/schema").MuVarint;
            rightShoulder: import("@box-local/mudb/schema").MuVarint;
            rightUpperArm: import("@box-local/mudb/schema").MuVarint;
            rightLowerArm: import("@box-local/mudb/schema").MuVarint;
            rightHand: import("@box-local/mudb/schema").MuVarint;
            leftUpperLeg: import("@box-local/mudb/schema").MuVarint;
            leftLowerLeg: import("@box-local/mudb/schema").MuVarint;
            leftFoot: import("@box-local/mudb/schema").MuVarint;
            rightUpperLeg: import("@box-local/mudb/schema").MuVarint;
            rightLowerLeg: import("@box-local/mudb/schema").MuVarint;
            rightFoot: import("@box-local/mudb/schema").MuVarint;
        }>;
        userId: import("@box-local/mudb/schema").MuUTF8;
        avatar_hash: import("@box-local/mudb/schema").MuASCII;
        skinInvisible: import("@box-local/mudb/schema").MuStruct<{
            hips: import("@box-local/mudb/schema").MuBoolean;
            torso: import("@box-local/mudb/schema").MuBoolean;
            neck: import("@box-local/mudb/schema").MuBoolean;
            head: import("@box-local/mudb/schema").MuBoolean;
            leftShoulder: import("@box-local/mudb/schema").MuBoolean;
            leftUpperArm: import("@box-local/mudb/schema").MuBoolean;
            leftLowerArm: import("@box-local/mudb/schema").MuBoolean;
            leftHand: import("@box-local/mudb/schema").MuBoolean;
            rightShoulder: import("@box-local/mudb/schema").MuBoolean;
            rightUpperArm: import("@box-local/mudb/schema").MuBoolean;
            rightLowerArm: import("@box-local/mudb/schema").MuBoolean;
            rightHand: import("@box-local/mudb/schema").MuBoolean;
            leftUpperLeg: import("@box-local/mudb/schema").MuBoolean;
            leftLowerLeg: import("@box-local/mudb/schema").MuBoolean;
            leftFoot: import("@box-local/mudb/schema").MuBoolean;
            rightUpperLeg: import("@box-local/mudb/schema").MuBoolean;
            rightLowerLeg: import("@box-local/mudb/schema").MuBoolean;
            rightFoot: import("@box-local/mudb/schema").MuBoolean;
        }>;
        mapSkin: import("@box-local/mudb/schema").MuStruct<{
            hips: import("@box-local/mudb/schema").MuVarint;
            torso: import("@box-local/mudb/schema").MuVarint;
            neck: import("@box-local/mudb/schema").MuVarint;
            head: import("@box-local/mudb/schema").MuVarint;
            leftShoulder: import("@box-local/mudb/schema").MuVarint;
            leftUpperArm: import("@box-local/mudb/schema").MuVarint;
            leftLowerArm: import("@box-local/mudb/schema").MuVarint;
            leftHand: import("@box-local/mudb/schema").MuVarint;
            rightShoulder: import("@box-local/mudb/schema").MuVarint;
            rightUpperArm: import("@box-local/mudb/schema").MuVarint;
            rightLowerArm: import("@box-local/mudb/schema").MuVarint;
            rightHand: import("@box-local/mudb/schema").MuVarint;
            leftUpperLeg: import("@box-local/mudb/schema").MuVarint;
            leftLowerLeg: import("@box-local/mudb/schema").MuVarint;
            leftFoot: import("@box-local/mudb/schema").MuVarint;
            rightUpperLeg: import("@box-local/mudb/schema").MuVarint;
            rightLowerLeg: import("@box-local/mudb/schema").MuVarint;
            rightFoot: import("@box-local/mudb/schema").MuVarint;
        }>;
        color: import("../../utils/quantized-schema").QuantizedVec3Schema;
        metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
        emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
        shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
        scale: import("@box-local/mudb/schema").MuQuantizedFloat;
        attachments: import("@box-local/mudb/schema").MuStruct<{
            hips: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            torso: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            neck: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            head: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftShoulder: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftUpperArm: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftLowerArm: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftHand: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightShoulder: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightUpperArm: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightLowerArm: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightHand: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftUpperLeg: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftLowerLeg: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftFoot: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightUpperLeg: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightLowerLeg: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightFoot: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
        }>;
    }>[]) => void;
} & {
    replica: (index: import("@box-local/mudb/schema/struct").Struct<{
        dirty: import("@box-local/mudb/schema").MuBoolean;
        tracker: import("@box-local/mudb/schema").MuStruct<{
            targetId: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            wrapMode: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").AnimationPlaybackMode>>;
            cycleLength: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            loopCount: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            loopPhase: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            tickOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuQuantizedFloat>;
            tickScale: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            data: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            inEasing: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>>;
            outEasing: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>>;
            prevFrame: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            nextFrame: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            prevWeight: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
            nextWeight: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat64>;
        }>;
        components: import("@box-local/mudb/schema").MuStruct<{
            skin: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            replica: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, dst: import("@box-local/mudb/schema/struct").Struct<{
        id: import("@box-local/mudb/schema").MuVarint;
        colorLUT: import("@box-local/mudb/schema").MuASCII;
        enableCursor: import("@box-local/mudb/schema").MuBoolean;
        music: import("@box-local/mudb/schema").MuStruct<{
            sampleId: import("@box-local/mudb/schema").MuVarint;
            radius: import("@box-local/mudb/schema").MuQuantizedFloat;
            gain: import("@box-local/mudb/schema").MuQuantizedFloat;
            gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
            pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>;
        camera: import("@box-local/mudb/schema").MuStruct<{
            mode: import("@box-local/mudb/schema").MuSchema<CameraMode>;
            targetId: import("@box-local/mudb/schema").MuVarint;
            eye: import("../../utils/quantized-schema").QuantizedVec3Schema;
            up: import("../../utils/quantized-schema").QuantizedVec3Schema;
            target: import("../../utils/quantized-schema").QuantizedVec3Schema;
            freezedAxis: import("@box-local/mudb/schema").MuUint8;
            fovY: import("../../utils/quantized-schema").QuantizedScalar;
            distance: import("../../utils/quantized-schema").QuantizedScalar;
        }>;
        gamepad: import("@box-local/mudb/schema").MuStruct<{
            joystickBackground: import("@box-local/mudb/schema").MuUTF8;
            joystickController: import("@box-local/mudb/schema").MuUTF8;
            flyButton: import("@box-local/mudb/schema").MuUTF8;
            flyingBackground: import("@box-local/mudb/schema").MuUTF8;
            flyingController: import("@box-local/mudb/schema").MuUTF8;
            jump: import("@box-local/mudb/schema").MuUTF8;
            crouch: import("@box-local/mudb/schema").MuUTF8;
            actionA: import("@box-local/mudb/schema").MuUTF8;
            actionB: import("@box-local/mudb/schema").MuUTF8;
        }>;
    }>[]) => void;
}, import("@box-local/mudb/schema").MuStruct<{
    skin: import("@box-local/mudb/schema").MuVarint;
} & {
    replica: import("@box-local/mudb/schema").MuVarint;
}>>;
export declare const PlayerAnimationSchema: import("@box-local/mudb/schema").MuStruct<{
    id: import("@box-local/mudb/schema").MuVarint;
    targetId: import("@box-local/mudb/schema").MuVarint;
    startTick: import("@box-local/mudb/schema").MuQuantizedFloat;
    endTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
    cycleTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
    cyclePhase: import("@box-local/mudb/schema").MuQuantizedFloat;
    cycleCount: import("@box-local/mudb/schema").MuQuantizedFloat;
    playbackMode: import("@box-local/mudb/schema").MuSchema<import("../type").AnimationPlaybackMode>;
    keyframes: import("@box-local/mudb/schema").MuSortedArray<import("@box-local/mudb/schema").MuStruct<{
        tick: import("@box-local/mudb/schema").MuQuantizedFloat;
        easeIn: import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>;
        easeOut: import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>;
        components: import("../mu-array-union").MuArrayUnion<[import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuStruct<{
            r: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            g: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            b: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuASCII]>]>;
    }>>;
}>;
export type PlayerAnimation = typeof PlayerAnimationSchema.identity;
export declare const PlayerAnimationSetSchema: import("@box-local/mudb/schema").MuSortedArray<import("@box-local/mudb/schema").MuStruct<{
    id: import("@box-local/mudb/schema").MuVarint;
    targetId: import("@box-local/mudb/schema").MuVarint;
    startTick: import("@box-local/mudb/schema").MuQuantizedFloat;
    endTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
    cycleTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
    cyclePhase: import("@box-local/mudb/schema").MuQuantizedFloat;
    cycleCount: import("@box-local/mudb/schema").MuQuantizedFloat;
    playbackMode: import("@box-local/mudb/schema").MuSchema<import("../type").AnimationPlaybackMode>;
    keyframes: import("@box-local/mudb/schema").MuSortedArray<import("@box-local/mudb/schema").MuStruct<{
        tick: import("@box-local/mudb/schema").MuQuantizedFloat;
        easeIn: import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>;
        easeOut: import("@box-local/mudb/schema").MuSchema<import("../type").KeyframeEaseMode>;
        components: import("../mu-array-union").MuArrayUnion<[import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuStruct<{
            r: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            g: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            b: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuASCII]>]>;
    }>>;
}>>;
//# sourceMappingURL=player-animation.d.ts.map