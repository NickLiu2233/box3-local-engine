import { GameWorldKeyframe } from '../../api/js/api';
import { MuFloat32 } from '@box-local/mudb/schema';
import { EnvironmentSkyType } from '../../project/project-rda';
export declare const WORLD_ANIM_BINDING: import("../keyframe-binding").AnimationBinding<GameWorldKeyframe, import("@box-local/mudb/schema").MuStruct<{
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
        components: import("../mu-array-union").MuArrayUnion<[import("../mu-array-union").MuArrayUnion<[]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>]>]>;
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
        environment: import("@box-local/mudb/schema").MuStruct<{
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
    }>;
}>, {
    environment: (index: import("@box-local/mudb/schema/struct").Struct<{
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
            environment: import("@box-local/mudb/schema").MuStruct<{
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
        }>;
    }>, components: import("@box-local/mudb/schema/struct").Struct<{
        fog: import("@box-local/mudb/schema").MuStruct<{
            fogColor: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            fogStartDistance: import("@box-local/mudb/schema").MuFloat64;
            fogHeightOffset: import("@box-local/mudb/schema").MuFloat64;
            fogHeightFalloff: import("@box-local/mudb/schema").MuFloat64;
            fogDensity: import("@box-local/mudb/schema").MuFloat64;
            maxFog: import("@box-local/mudb/schema").MuFloat64;
        }>;
        sky: import("@box-local/mudb/schema").MuStruct<{
            skyType: import("@box-local/mudb/schema").MuSchema<EnvironmentSkyType>;
            globalLight: import("@box-local/mudb/schema").MuFloat64;
            sunPhase: import("@box-local/mudb/schema").MuFloat64;
            sunFrequency: import("@box-local/mudb/schema").MuFloat64;
            lunarPhase: import("@box-local/mudb/schema").MuFloat64;
            sunDirection: import("@box-local/mudb/schema").MuStruct<{
                x: import("@box-local/mudb/schema").MuFloat64;
                y: import("@box-local/mudb/schema").MuFloat64;
                z: import("@box-local/mudb/schema").MuFloat64;
            }>;
            sunColor: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            skyLeft: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            skyRight: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            skyTop: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            skyBottom: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            skyFront: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            skyBack: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            gamma: MuFloat32;
        }>;
        snow: import("@box-local/mudb/schema").MuStruct<{
            texture: import("@box-local/mudb/schema").MuUTF8;
            density: import("@box-local/mudb/schema").MuFloat64;
            size: import("@box-local/mudb/schema").MuStruct<{
                w: import("@box-local/mudb/schema").MuFloat64;
                h: import("@box-local/mudb/schema").MuFloat64;
            }>;
            fallSpeed: import("@box-local/mudb/schema").MuFloat64;
            spinSpeed: import("@box-local/mudb/schema").MuFloat64;
            color: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
                a: import("@box-local/mudb/schema").MuFloat64;
            }>;
        }>;
        rain: import("@box-local/mudb/schema").MuStruct<{
            density: import("@box-local/mudb/schema").MuFloat64;
            direction: import("@box-local/mudb/schema").MuStruct<{
                x: import("@box-local/mudb/schema").MuFloat64;
                y: import("@box-local/mudb/schema").MuFloat64;
                z: import("@box-local/mudb/schema").MuFloat64;
            }>;
            speed: import("@box-local/mudb/schema").MuFloat64;
            size: import("@box-local/mudb/schema").MuStruct<{
                w: import("@box-local/mudb/schema").MuFloat64;
                h: import("@box-local/mudb/schema").MuFloat64;
            }>;
            interference: import("@box-local/mudb/schema").MuFloat64;
            color: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
                a: import("@box-local/mudb/schema").MuFloat64;
            }>;
        }>;
        drawDistance: MuFloat32;
        bakedShadow: import("@box-local/mudb/schema").MuStruct<{
            texture: import("@box-local/mudb/schema").MuASCII;
            data: import("@box-local/mudb/schema").MuASCII;
            chunkShift: import("@box-local/mudb/schema").MuVarint;
        }>;
    }>) => void;
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
            environment: import("@box-local/mudb/schema").MuStruct<{
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
        }>;
    }>, components: import("@box-local/mudb/schema/struct").Struct<{
        gravity: import("@box-local/mudb/schema").MuFloat64;
        velocityDamping: import("@box-local/mudb/schema").MuFloat64;
        useOBB: import("@box-local/mudb/schema").MuBoolean;
    }>) => void;
}, {
    environment: (index: import("@box-local/mudb/schema/struct").Struct<{
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
            environment: import("@box-local/mudb/schema").MuStruct<{
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
        }>;
    }>, dst: import("@box-local/mudb/schema/struct").Struct<{
        fog: import("@box-local/mudb/schema").MuStruct<{
            fogColor: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            fogStartDistance: import("@box-local/mudb/schema").MuFloat64;
            fogHeightOffset: import("@box-local/mudb/schema").MuFloat64;
            fogHeightFalloff: import("@box-local/mudb/schema").MuFloat64;
            fogDensity: import("@box-local/mudb/schema").MuFloat64;
            maxFog: import("@box-local/mudb/schema").MuFloat64;
        }>;
        sky: import("@box-local/mudb/schema").MuStruct<{
            skyType: import("@box-local/mudb/schema").MuSchema<EnvironmentSkyType>;
            globalLight: import("@box-local/mudb/schema").MuFloat64;
            sunPhase: import("@box-local/mudb/schema").MuFloat64;
            sunFrequency: import("@box-local/mudb/schema").MuFloat64;
            lunarPhase: import("@box-local/mudb/schema").MuFloat64;
            sunDirection: import("@box-local/mudb/schema").MuStruct<{
                x: import("@box-local/mudb/schema").MuFloat64;
                y: import("@box-local/mudb/schema").MuFloat64;
                z: import("@box-local/mudb/schema").MuFloat64;
            }>;
            sunColor: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            skyLeft: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            skyRight: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            skyTop: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            skyBottom: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            skyFront: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            skyBack: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
            }>;
            gamma: MuFloat32;
        }>;
        snow: import("@box-local/mudb/schema").MuStruct<{
            texture: import("@box-local/mudb/schema").MuUTF8;
            density: import("@box-local/mudb/schema").MuFloat64;
            size: import("@box-local/mudb/schema").MuStruct<{
                w: import("@box-local/mudb/schema").MuFloat64;
                h: import("@box-local/mudb/schema").MuFloat64;
            }>;
            fallSpeed: import("@box-local/mudb/schema").MuFloat64;
            spinSpeed: import("@box-local/mudb/schema").MuFloat64;
            color: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
                a: import("@box-local/mudb/schema").MuFloat64;
            }>;
        }>;
        rain: import("@box-local/mudb/schema").MuStruct<{
            density: import("@box-local/mudb/schema").MuFloat64;
            direction: import("@box-local/mudb/schema").MuStruct<{
                x: import("@box-local/mudb/schema").MuFloat64;
                y: import("@box-local/mudb/schema").MuFloat64;
                z: import("@box-local/mudb/schema").MuFloat64;
            }>;
            speed: import("@box-local/mudb/schema").MuFloat64;
            size: import("@box-local/mudb/schema").MuStruct<{
                w: import("@box-local/mudb/schema").MuFloat64;
                h: import("@box-local/mudb/schema").MuFloat64;
            }>;
            interference: import("@box-local/mudb/schema").MuFloat64;
            color: import("@box-local/mudb/schema").MuStruct<{
                r: import("@box-local/mudb/schema").MuFloat64;
                g: import("@box-local/mudb/schema").MuFloat64;
                b: import("@box-local/mudb/schema").MuFloat64;
                a: import("@box-local/mudb/schema").MuFloat64;
            }>;
        }>;
        drawDistance: MuFloat32;
        bakedShadow: import("@box-local/mudb/schema").MuStruct<{
            texture: import("@box-local/mudb/schema").MuASCII;
            data: import("@box-local/mudb/schema").MuASCII;
            chunkShift: import("@box-local/mudb/schema").MuVarint;
        }>;
    }>) => void;
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
            environment: import("@box-local/mudb/schema").MuStruct<{
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
        }>;
    }>, dst: import("@box-local/mudb/schema/struct").Struct<{
        gravity: import("@box-local/mudb/schema").MuFloat64;
        velocityDamping: import("@box-local/mudb/schema").MuFloat64;
        useOBB: import("@box-local/mudb/schema").MuBoolean;
    }>) => void;
}, import("@box-local/mudb/schema").MuStruct<{
    environment: import("@box-local/mudb/schema").MuVarint;
} & {
    physics: import("@box-local/mudb/schema").MuVarint;
}>>;
export declare const WorldAnimationSchema: import("@box-local/mudb/schema").MuStruct<{
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
        components: import("../mu-array-union").MuArrayUnion<[import("../mu-array-union").MuArrayUnion<[]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>]>]>;
    }>>;
}>;
export type WorldAnimation = typeof WorldAnimationSchema.identity;
export declare const WorldAnimationSetSchema: import("@box-local/mudb/schema").MuSortedArray<import("@box-local/mudb/schema").MuStruct<{
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
        components: import("../mu-array-union").MuArrayUnion<[import("../mu-array-union").MuArrayUnion<[]>, import("../mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>]>]>;
    }>>;
}>>;
export declare const WorldAnimationIndexSchema: import("@box-local/mudb/schema").MuStruct<{
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
        environment: import("@box-local/mudb/schema").MuStruct<{
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
    }>;
}>;
export type WorldAnimationIndex = typeof WorldAnimationIndexSchema.identity;
//# sourceMappingURL=world-animation.d.ts.map