import { GameEntityKeyframe } from '../../api/js/api';
import { RigidBody } from '../../physics/physics-schema';
export declare const ENTITY_ANIM_BINDING: import("../keyframe-binding").AnimationBinding<GameEntityKeyframe, import("@box-local/mudb/schema").MuStruct<{
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
        components: import("../mu-array-union").MuArrayUnion<[import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuVarint, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuStruct<{}>, import("@box-local/mudb/schema").MuStruct<{}>, import("@box-local/mudb/schema").MuUint32]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuStruct<{}>, import("@box-local/mudb/schema").MuStruct<{} | {
            [x: string]: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuStruct<{} | {
            [x: string]: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuStruct<{
            x: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            y: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            z: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuStruct<{
            x: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            y: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            z: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuStruct<{
            color0: import("@box-local/mudb/schema").MuUint32;
            color1: import("@box-local/mudb/schema").MuUint32;
            color2: import("@box-local/mudb/schema").MuUint32;
            color3: import("@box-local/mudb/schema").MuUint32;
            color4: import("@box-local/mudb/schema").MuUint32;
        }>, import("@box-local/mudb/schema").MuStruct<{
            size0: import("@box-local/mudb/schema").MuQuantizedFloat;
            size1: import("@box-local/mudb/schema").MuQuantizedFloat;
            size2: import("@box-local/mudb/schema").MuQuantizedFloat;
            size3: import("@box-local/mudb/schema").MuQuantizedFloat;
            size4: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuStruct<{
            x: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            y: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            z: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuVarint, import("@box-local/mudb/schema").MuSchema<number>]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuStruct<{
            r: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            g: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            b: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>]>]>;
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
        mesh: import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
        }>;
    } & {
        physics: import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
        }>;
    } & {
        particles: import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
        }>;
    } & {
        particle_mat: import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
        }>;
    } & {
        interact: import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
        }>;
    }>;
}>, {
    mesh: (index: import("@box-local/mudb/schema/struct").Struct<{
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
            mesh: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            physics: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particles: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particle_mat: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            interact: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, components: import("@box-local/mudb/schema/struct").Struct<{
        id: import("@box-local/mudb/schema").MuVarint;
        meshId: import("@box-local/mudb/schema").MuVarint;
        invisible: import("@box-local/mudb/schema").MuBoolean;
        red: import("@box-local/mudb/schema").MuUint8;
        green: import("@box-local/mudb/schema").MuUint8;
        blue: import("@box-local/mudb/schema").MuUint8;
        alpha: import("@box-local/mudb/schema").MuUint8;
        emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
        shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
        metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
        scaleX: import("@box-local/mudb/schema").MuQuantizedFloat;
        scaleY: import("@box-local/mudb/schema").MuQuantizedFloat;
        scaleZ: import("@box-local/mudb/schema").MuQuantizedFloat;
        offsetX: import("@box-local/mudb/schema").MuQuantizedFloat;
        offsetY: import("@box-local/mudb/schema").MuQuantizedFloat;
        offsetZ: import("@box-local/mudb/schema").MuQuantizedFloat;
        motion: import("@box-local/mudb/schema").MuStruct<{
            defaultMotionId: import("@box-local/mudb/schema").MuASCII;
            paused: import("@box-local/mudb/schema").MuBoolean;
            pausedTick: import("@box-local/mudb/schema").MuFloat64;
            startTick: import("@box-local/mudb/schema").MuFloat64;
            playback: import("@box-local/mudb/schema").MuStruct<{
                motions: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                    motionId: import("@box-local/mudb/schema").MuASCII;
                    cycleCount: import("@box-local/mudb/schema").MuInt32;
                }>>;
                startTick: import("@box-local/mudb/schema").MuFloat64;
                cycleCount: import("@box-local/mudb/schema").MuInt32;
            }>;
        }>;
        staticShadow: import("@box-local/mudb/schema").MuBoolean;
        name: import("@box-local/mudb/schema").MuUTF8;
    }>[]) => void;
} & {
    physics: (index: import("@box-local/mudb/schema/struct").Struct<{
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
            mesh: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            physics: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particles: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particle_mat: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            interact: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, components: RigidBody[]) => void;
} & {
    particles: (index: import("@box-local/mudb/schema/struct").Struct<{
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
            mesh: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            physics: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particles: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particle_mat: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            interact: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, components: import("@box-local/mudb/schema/struct").Struct<{
        countLimit: import("@box-local/mudb/schema").MuVarint;
        emitRate: import("@box-local/mudb/schema").MuQuantizedFloat;
        emitSpread: import("@box-local/mudb/schema").MuQuantizedFloat;
        lifetime: import("@box-local/mudb/schema").MuQuantizedFloat;
        lifetimeSpread: import("@box-local/mudb/schema").MuQuantizedFloat;
        velocity: import("../../utils/quantized-schema").QuantizedVec3Schema;
        velocitySpread: import("../../utils/quantized-schema").QuantizedVec3Schema;
    }>[]) => void;
} & {
    particle_mat: (index: import("@box-local/mudb/schema/struct").Struct<{
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
            mesh: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            physics: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particles: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particle_mat: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            interact: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, components: import("@box-local/mudb/schema/struct").Struct<{
        acceleration: import("../../utils/quantized-schema").QuantizedVec3Schema;
        noiseAmpl: import("@box-local/mudb/schema").MuQuantizedFloat;
        noiseFreq: import("@box-local/mudb/schema").MuQuantizedFloat;
        targetId: import("@box-local/mudb/schema").MuVarint;
        targetWeight: import("@box-local/mudb/schema").MuQuantizedFloat;
        color0: import("@box-local/mudb/schema").MuUint32;
        color1: import("@box-local/mudb/schema").MuUint32;
        color2: import("@box-local/mudb/schema").MuUint32;
        color3: import("@box-local/mudb/schema").MuUint32;
        color4: import("@box-local/mudb/schema").MuUint32;
        size0: import("@box-local/mudb/schema").MuQuantizedFloat;
        size1: import("@box-local/mudb/schema").MuQuantizedFloat;
        size2: import("@box-local/mudb/schema").MuQuantizedFloat;
        size3: import("@box-local/mudb/schema").MuQuantizedFloat;
        size4: import("@box-local/mudb/schema").MuQuantizedFloat;
        sizeSpread: import("@box-local/mudb/schema").MuQuantizedFloat;
        damping: import("@box-local/mudb/schema").MuQuantizedFloat;
        id: import("@box-local/mudb/schema").MuVarint;
    }>[]) => void;
} & {
    interact: (index: import("@box-local/mudb/schema/struct").Struct<{
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
            mesh: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            physics: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particles: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particle_mat: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            interact: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, components: import("@box-local/mudb/schema/struct").Struct<{
        id: import("@box-local/mudb/schema").MuVarint;
        radius: import("@box-local/mudb/schema").MuQuantizedFloat;
        hint: import("@box-local/mudb/schema").MuUTF8;
        color: import("../../utils/quantized-schema").QuantizedVec3Schema;
    }>[]) => void;
}, {
    mesh: (index: import("@box-local/mudb/schema/struct").Struct<{
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
            mesh: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            physics: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particles: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particle_mat: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            interact: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, dst: import("@box-local/mudb/schema/struct").Struct<{
        id: import("@box-local/mudb/schema").MuVarint;
        meshId: import("@box-local/mudb/schema").MuVarint;
        invisible: import("@box-local/mudb/schema").MuBoolean;
        red: import("@box-local/mudb/schema").MuUint8;
        green: import("@box-local/mudb/schema").MuUint8;
        blue: import("@box-local/mudb/schema").MuUint8;
        alpha: import("@box-local/mudb/schema").MuUint8;
        emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
        shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
        metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
        scaleX: import("@box-local/mudb/schema").MuQuantizedFloat;
        scaleY: import("@box-local/mudb/schema").MuQuantizedFloat;
        scaleZ: import("@box-local/mudb/schema").MuQuantizedFloat;
        offsetX: import("@box-local/mudb/schema").MuQuantizedFloat;
        offsetY: import("@box-local/mudb/schema").MuQuantizedFloat;
        offsetZ: import("@box-local/mudb/schema").MuQuantizedFloat;
        motion: import("@box-local/mudb/schema").MuStruct<{
            defaultMotionId: import("@box-local/mudb/schema").MuASCII;
            paused: import("@box-local/mudb/schema").MuBoolean;
            pausedTick: import("@box-local/mudb/schema").MuFloat64;
            startTick: import("@box-local/mudb/schema").MuFloat64;
            playback: import("@box-local/mudb/schema").MuStruct<{
                motions: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                    motionId: import("@box-local/mudb/schema").MuASCII;
                    cycleCount: import("@box-local/mudb/schema").MuInt32;
                }>>;
                startTick: import("@box-local/mudb/schema").MuFloat64;
                cycleCount: import("@box-local/mudb/schema").MuInt32;
            }>;
        }>;
        staticShadow: import("@box-local/mudb/schema").MuBoolean;
        name: import("@box-local/mudb/schema").MuUTF8;
    }>[]) => void;
} & {
    physics: (index: import("@box-local/mudb/schema/struct").Struct<{
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
            mesh: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            physics: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particles: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particle_mat: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            interact: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, dst: RigidBody[]) => void;
} & {
    particles: (index: import("@box-local/mudb/schema/struct").Struct<{
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
            mesh: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            physics: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particles: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particle_mat: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            interact: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, dst: import("@box-local/mudb/schema/struct").Struct<{
        countLimit: import("@box-local/mudb/schema").MuVarint;
        emitRate: import("@box-local/mudb/schema").MuQuantizedFloat;
        emitSpread: import("@box-local/mudb/schema").MuQuantizedFloat;
        lifetime: import("@box-local/mudb/schema").MuQuantizedFloat;
        lifetimeSpread: import("@box-local/mudb/schema").MuQuantizedFloat;
        velocity: import("../../utils/quantized-schema").QuantizedVec3Schema;
        velocitySpread: import("../../utils/quantized-schema").QuantizedVec3Schema;
    }>[]) => void;
} & {
    particle_mat: (index: import("@box-local/mudb/schema/struct").Struct<{
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
            mesh: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            physics: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particles: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particle_mat: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            interact: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, dst: import("@box-local/mudb/schema/struct").Struct<{
        acceleration: import("../../utils/quantized-schema").QuantizedVec3Schema;
        noiseAmpl: import("@box-local/mudb/schema").MuQuantizedFloat;
        noiseFreq: import("@box-local/mudb/schema").MuQuantizedFloat;
        targetId: import("@box-local/mudb/schema").MuVarint;
        targetWeight: import("@box-local/mudb/schema").MuQuantizedFloat;
        color0: import("@box-local/mudb/schema").MuUint32;
        color1: import("@box-local/mudb/schema").MuUint32;
        color2: import("@box-local/mudb/schema").MuUint32;
        color3: import("@box-local/mudb/schema").MuUint32;
        color4: import("@box-local/mudb/schema").MuUint32;
        size0: import("@box-local/mudb/schema").MuQuantizedFloat;
        size1: import("@box-local/mudb/schema").MuQuantizedFloat;
        size2: import("@box-local/mudb/schema").MuQuantizedFloat;
        size3: import("@box-local/mudb/schema").MuQuantizedFloat;
        size4: import("@box-local/mudb/schema").MuQuantizedFloat;
        sizeSpread: import("@box-local/mudb/schema").MuQuantizedFloat;
        damping: import("@box-local/mudb/schema").MuQuantizedFloat;
        id: import("@box-local/mudb/schema").MuVarint;
    }>[]) => void;
} & {
    interact: (index: import("@box-local/mudb/schema/struct").Struct<{
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
            mesh: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            physics: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particles: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            particle_mat: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        } & {
            interact: import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
                animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
            }>;
        }>;
    }>, dst: import("@box-local/mudb/schema/struct").Struct<{
        id: import("@box-local/mudb/schema").MuVarint;
        radius: import("@box-local/mudb/schema").MuQuantizedFloat;
        hint: import("@box-local/mudb/schema").MuUTF8;
        color: import("../../utils/quantized-schema").QuantizedVec3Schema;
    }>[]) => void;
}, import("@box-local/mudb/schema").MuStruct<{
    mesh: import("@box-local/mudb/schema").MuVarint;
} & {
    physics: import("@box-local/mudb/schema").MuVarint;
} & {
    particles: import("@box-local/mudb/schema").MuVarint;
} & {
    particle_mat: import("@box-local/mudb/schema").MuVarint;
} & {
    interact: import("@box-local/mudb/schema").MuVarint;
}>>;
export declare const EntityAnimationSchema: import("@box-local/mudb/schema").MuStruct<{
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
        components: import("../mu-array-union").MuArrayUnion<[import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuVarint, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuStruct<{}>, import("@box-local/mudb/schema").MuStruct<{}>, import("@box-local/mudb/schema").MuUint32]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuStruct<{}>, import("@box-local/mudb/schema").MuStruct<{} | {
            [x: string]: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuStruct<{} | {
            [x: string]: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuStruct<{
            x: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            y: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            z: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuStruct<{
            x: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            y: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            z: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuStruct<{
            color0: import("@box-local/mudb/schema").MuUint32;
            color1: import("@box-local/mudb/schema").MuUint32;
            color2: import("@box-local/mudb/schema").MuUint32;
            color3: import("@box-local/mudb/schema").MuUint32;
            color4: import("@box-local/mudb/schema").MuUint32;
        }>, import("@box-local/mudb/schema").MuStruct<{
            size0: import("@box-local/mudb/schema").MuQuantizedFloat;
            size1: import("@box-local/mudb/schema").MuQuantizedFloat;
            size2: import("@box-local/mudb/schema").MuQuantizedFloat;
            size3: import("@box-local/mudb/schema").MuQuantizedFloat;
            size4: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuStruct<{
            x: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            y: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            z: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuVarint, import("@box-local/mudb/schema").MuSchema<number>]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuStruct<{
            r: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            g: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            b: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>]>]>;
    }>>;
}>;
export type EntityAnimation = typeof EntityAnimationSchema.identity;
export declare const EntityAnimationSetSchema: import("@box-local/mudb/schema").MuSortedArray<import("@box-local/mudb/schema").MuStruct<{
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
        components: import("../mu-array-union").MuArrayUnion<[import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuVarint, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuStruct<{}>, import("@box-local/mudb/schema").MuStruct<{}>, import("@box-local/mudb/schema").MuUint32]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuStruct<{}>, import("@box-local/mudb/schema").MuStruct<{} | {
            [x: string]: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuStruct<{} | {
            [x: string]: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuStruct<{
            x: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            y: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            z: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuStruct<{
            x: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            y: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            z: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuStruct<{
            color0: import("@box-local/mudb/schema").MuUint32;
            color1: import("@box-local/mudb/schema").MuUint32;
            color2: import("@box-local/mudb/schema").MuUint32;
            color3: import("@box-local/mudb/schema").MuUint32;
            color4: import("@box-local/mudb/schema").MuUint32;
        }>, import("@box-local/mudb/schema").MuStruct<{
            size0: import("@box-local/mudb/schema").MuQuantizedFloat;
            size1: import("@box-local/mudb/schema").MuQuantizedFloat;
            size2: import("@box-local/mudb/schema").MuQuantizedFloat;
            size3: import("@box-local/mudb/schema").MuQuantizedFloat;
            size4: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuStruct<{
            x: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            y: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            z: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuVarint, import("@box-local/mudb/schema").MuSchema<number>]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuStruct<{
            r: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            g: import("@box-local/mudb/schema").MuQuantizedFloat;
        } & {
            b: import("@box-local/mudb/schema").MuQuantizedFloat;
        }>]>]>;
    }>>;
}>>;
export declare const EntityAnimationIndexSchema: import("@box-local/mudb/schema").MuStruct<{
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
        mesh: import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
        }>;
    } & {
        physics: import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
        }>;
    } & {
        particles: import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
        }>;
    } & {
        particle_mat: import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
        }>;
    } & {
        interact: import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            frameOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            dataOffset: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            typeData: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
            animData: import("@box-local/mudb/schema").MuArray<import("../../utils/ref-schema").MuRefSchema<any>>;
        }>;
    }>;
}>;
export type EntityAnimationIndex = typeof EntityAnimationIndexSchema.identity;
//# sourceMappingURL=entity-animation.d.ts.map