import { MuStruct } from '@box-local/mudb/schema';
export declare const KeyframeReplicaSchema: MuStruct<{
    entity: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        id: import("@box-local/mudb/schema").MuVarint;
        targetId: import("@box-local/mudb/schema").MuVarint;
        startTick: import("@box-local/mudb/schema").MuQuantizedFloat;
        endTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
        cycleTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
        cyclePhase: import("@box-local/mudb/schema").MuQuantizedFloat;
        cycleCount: import("@box-local/mudb/schema").MuQuantizedFloat;
        playbackMode: import("@box-local/mudb/schema").MuSchema<import("./type").AnimationPlaybackMode>;
        keyframes: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
            tick: import("@box-local/mudb/schema").MuQuantizedFloat;
            easeIn: import("@box-local/mudb/schema").MuSchema<import("./type").KeyframeEaseMode>;
            easeOut: import("@box-local/mudb/schema").MuSchema<import("./type").KeyframeEaseMode>;
            components: import("./mu-array-union").MuArrayUnion<[import("./mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuVarint, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, MuStruct<{}>, MuStruct<{}>, import("@box-local/mudb/schema").MuUint32]>, import("./mu-array-union").MuArrayUnion<[MuStruct<{}>, MuStruct<{} | {
                [x: string]: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>, MuStruct<{} | {
                [x: string]: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean]>, import("./mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, MuStruct<{
                x: import("@box-local/mudb/schema").MuQuantizedFloat;
            } & {
                y: import("@box-local/mudb/schema").MuQuantizedFloat;
            } & {
                z: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>, MuStruct<{
                x: import("@box-local/mudb/schema").MuQuantizedFloat;
            } & {
                y: import("@box-local/mudb/schema").MuQuantizedFloat;
            } & {
                z: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>]>, import("./mu-array-union").MuArrayUnion<[MuStruct<{
                color0: import("@box-local/mudb/schema").MuUint32;
                color1: import("@box-local/mudb/schema").MuUint32;
                color2: import("@box-local/mudb/schema").MuUint32;
                color3: import("@box-local/mudb/schema").MuUint32;
                color4: import("@box-local/mudb/schema").MuUint32;
            }>, MuStruct<{
                size0: import("@box-local/mudb/schema").MuQuantizedFloat;
                size1: import("@box-local/mudb/schema").MuQuantizedFloat;
                size2: import("@box-local/mudb/schema").MuQuantizedFloat;
                size3: import("@box-local/mudb/schema").MuQuantizedFloat;
                size4: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, MuStruct<{
                x: import("@box-local/mudb/schema").MuQuantizedFloat;
            } & {
                y: import("@box-local/mudb/schema").MuQuantizedFloat;
            } & {
                z: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuVarint, import("@box-local/mudb/schema").MuSchema<number>]>, import("./mu-array-union").MuArrayUnion<[MuStruct<{
                r: import("@box-local/mudb/schema").MuQuantizedFloat;
            } & {
                g: import("@box-local/mudb/schema").MuQuantizedFloat;
            } & {
                b: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>]>]>;
        }>>;
    }>>;
    player: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        id: import("@box-local/mudb/schema").MuVarint;
        targetId: import("@box-local/mudb/schema").MuVarint;
        startTick: import("@box-local/mudb/schema").MuQuantizedFloat;
        endTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
        cycleTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
        cyclePhase: import("@box-local/mudb/schema").MuQuantizedFloat;
        cycleCount: import("@box-local/mudb/schema").MuQuantizedFloat;
        playbackMode: import("@box-local/mudb/schema").MuSchema<import("./type").AnimationPlaybackMode>;
        keyframes: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
            tick: import("@box-local/mudb/schema").MuQuantizedFloat;
            easeIn: import("@box-local/mudb/schema").MuSchema<import("./type").KeyframeEaseMode>;
            easeOut: import("@box-local/mudb/schema").MuSchema<import("./type").KeyframeEaseMode>;
            components: import("./mu-array-union").MuArrayUnion<[import("./mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, MuStruct<{
                r: import("@box-local/mudb/schema").MuQuantizedFloat;
            } & {
                g: import("@box-local/mudb/schema").MuQuantizedFloat;
            } & {
                b: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean, import("@box-local/mudb/schema").MuBoolean]>, import("./mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuASCII]>]>;
        }>>;
    }>>;
    world: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        id: import("@box-local/mudb/schema").MuVarint;
        targetId: import("@box-local/mudb/schema").MuVarint;
        startTick: import("@box-local/mudb/schema").MuQuantizedFloat;
        endTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
        cycleTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
        cyclePhase: import("@box-local/mudb/schema").MuQuantizedFloat;
        cycleCount: import("@box-local/mudb/schema").MuQuantizedFloat;
        playbackMode: import("@box-local/mudb/schema").MuSchema<import("./type").AnimationPlaybackMode>;
        keyframes: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
            tick: import("@box-local/mudb/schema").MuQuantizedFloat;
            easeIn: import("@box-local/mudb/schema").MuSchema<import("./type").KeyframeEaseMode>;
            easeOut: import("@box-local/mudb/schema").MuSchema<import("./type").KeyframeEaseMode>;
            components: import("./mu-array-union").MuArrayUnion<[import("./mu-array-union").MuArrayUnion<[]>, import("./mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>]>]>;
        }>>;
    }>>;
}>;
//# sourceMappingURL=keyframe-schema.d.ts.map