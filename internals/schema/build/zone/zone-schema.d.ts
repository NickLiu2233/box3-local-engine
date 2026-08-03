import { MuBoolean, MuQuantizedFloat, MuSortedArray, MuStruct, MuVarint } from '@box-local/mudb/schema';
export declare const ZoneSchema: MuStruct<{
    id: MuVarint;
    minX: MuQuantizedFloat;
    minY: MuQuantizedFloat;
    minZ: MuQuantizedFloat;
    maxX: MuQuantizedFloat;
    maxY: MuQuantizedFloat;
    maxZ: MuQuantizedFloat;
}>;
export declare const ZoneSelectorGroupSchema: MuStruct<{
    id: MuVarint;
    groupBits: MuSortedArray<MuVarint>;
}>;
export type ZoneSelectorGroup = typeof ZoneSelectorGroupSchema.identity;
export declare const ZoneSelectorGroupSetSchema: MuSortedArray<MuStruct<{
    id: MuVarint;
    groupBits: MuSortedArray<MuVarint>;
}>>;
export declare const PhysicsZoneSchema: MuStruct<{
    id: MuVarint;
    minX: MuQuantizedFloat;
    minY: MuQuantizedFloat;
    minZ: MuQuantizedFloat;
    maxX: MuQuantizedFloat;
    maxY: MuQuantizedFloat;
    maxZ: MuQuantizedFloat;
    selectorGroup: MuVarint;
    massScale: MuQuantizedFloat;
    fx: MuQuantizedFloat;
    fy: MuQuantizedFloat;
    fz: MuQuantizedFloat;
}>;
export type PhysicsZone = typeof PhysicsZoneSchema.identity;
export declare const PhysicsZoneSetSchema: MuSortedArray<MuStruct<{
    id: MuVarint;
    minX: MuQuantizedFloat;
    minY: MuQuantizedFloat;
    minZ: MuQuantizedFloat;
    maxX: MuQuantizedFloat;
    maxY: MuQuantizedFloat;
    maxZ: MuQuantizedFloat;
    selectorGroup: MuVarint;
    massScale: MuQuantizedFloat;
    fx: MuQuantizedFloat;
    fy: MuQuantizedFloat;
    fz: MuQuantizedFloat;
}>>;
export declare const EnvironmentZoneSchema: MuStruct<{
    id: MuVarint;
    minX: MuQuantizedFloat;
    minY: MuQuantizedFloat;
    minZ: MuQuantizedFloat;
    maxX: MuQuantizedFloat;
    maxY: MuQuantizedFloat;
    maxZ: MuQuantizedFloat;
    overrideFog: MuBoolean;
    fog: MuStruct<{
        fogColor: MuStruct<{
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
    overrideSky: MuBoolean;
    sky: MuStruct<{
        skyType: import("@box-local/mudb/schema").MuSchema<import("../project/project-rda").EnvironmentSkyType>;
        globalLight: import("@box-local/mudb/schema").MuFloat64;
        sunPhase: import("@box-local/mudb/schema").MuFloat64;
        sunFrequency: import("@box-local/mudb/schema").MuFloat64;
        lunarPhase: import("@box-local/mudb/schema").MuFloat64;
        sunDirection: MuStruct<{
            x: import("@box-local/mudb/schema").MuFloat64;
            y: import("@box-local/mudb/schema").MuFloat64;
            z: import("@box-local/mudb/schema").MuFloat64;
        }>;
        sunColor: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        skyLeft: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        skyRight: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        skyTop: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        skyBottom: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        skyFront: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        skyBack: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        gamma: import("@box-local/mudb/schema").MuFloat32;
    }>;
    overrideSnow: MuBoolean;
    snow: MuStruct<{
        texture: import("@box-local/mudb/schema").MuUTF8;
        density: import("@box-local/mudb/schema").MuFloat64;
        size: MuStruct<{
            w: import("@box-local/mudb/schema").MuFloat64;
            h: import("@box-local/mudb/schema").MuFloat64;
        }>;
        fallSpeed: import("@box-local/mudb/schema").MuFloat64;
        spinSpeed: import("@box-local/mudb/schema").MuFloat64;
        color: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
            a: import("@box-local/mudb/schema").MuFloat64;
        }>;
    }>;
    overrideRain: MuBoolean;
    rain: MuStruct<{
        density: import("@box-local/mudb/schema").MuFloat64;
        direction: MuStruct<{
            x: import("@box-local/mudb/schema").MuFloat64;
            y: import("@box-local/mudb/schema").MuFloat64;
            z: import("@box-local/mudb/schema").MuFloat64;
        }>;
        speed: import("@box-local/mudb/schema").MuFloat64;
        size: MuStruct<{
            w: import("@box-local/mudb/schema").MuFloat64;
            h: import("@box-local/mudb/schema").MuFloat64;
        }>;
        interference: import("@box-local/mudb/schema").MuFloat64;
        color: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
            a: import("@box-local/mudb/schema").MuFloat64;
        }>;
    }>;
}>;
export type EnvironmentZone = typeof EnvironmentZoneSchema.identity;
export type EnvironmentZoneSchema = typeof EnvironmentZoneSchema.identity;
export declare const EnvironmentZoneSetSchema: MuSortedArray<MuStruct<{
    id: MuVarint;
    minX: MuQuantizedFloat;
    minY: MuQuantizedFloat;
    minZ: MuQuantizedFloat;
    maxX: MuQuantizedFloat;
    maxY: MuQuantizedFloat;
    maxZ: MuQuantizedFloat;
    overrideFog: MuBoolean;
    fog: MuStruct<{
        fogColor: MuStruct<{
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
    overrideSky: MuBoolean;
    sky: MuStruct<{
        skyType: import("@box-local/mudb/schema").MuSchema<import("../project/project-rda").EnvironmentSkyType>;
        globalLight: import("@box-local/mudb/schema").MuFloat64;
        sunPhase: import("@box-local/mudb/schema").MuFloat64;
        sunFrequency: import("@box-local/mudb/schema").MuFloat64;
        lunarPhase: import("@box-local/mudb/schema").MuFloat64;
        sunDirection: MuStruct<{
            x: import("@box-local/mudb/schema").MuFloat64;
            y: import("@box-local/mudb/schema").MuFloat64;
            z: import("@box-local/mudb/schema").MuFloat64;
        }>;
        sunColor: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        skyLeft: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        skyRight: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        skyTop: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        skyBottom: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        skyFront: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        skyBack: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
        }>;
        gamma: import("@box-local/mudb/schema").MuFloat32;
    }>;
    overrideSnow: MuBoolean;
    snow: MuStruct<{
        texture: import("@box-local/mudb/schema").MuUTF8;
        density: import("@box-local/mudb/schema").MuFloat64;
        size: MuStruct<{
            w: import("@box-local/mudb/schema").MuFloat64;
            h: import("@box-local/mudb/schema").MuFloat64;
        }>;
        fallSpeed: import("@box-local/mudb/schema").MuFloat64;
        spinSpeed: import("@box-local/mudb/schema").MuFloat64;
        color: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
            a: import("@box-local/mudb/schema").MuFloat64;
        }>;
    }>;
    overrideRain: MuBoolean;
    rain: MuStruct<{
        density: import("@box-local/mudb/schema").MuFloat64;
        direction: MuStruct<{
            x: import("@box-local/mudb/schema").MuFloat64;
            y: import("@box-local/mudb/schema").MuFloat64;
            z: import("@box-local/mudb/schema").MuFloat64;
        }>;
        speed: import("@box-local/mudb/schema").MuFloat64;
        size: MuStruct<{
            w: import("@box-local/mudb/schema").MuFloat64;
            h: import("@box-local/mudb/schema").MuFloat64;
        }>;
        interference: import("@box-local/mudb/schema").MuFloat64;
        color: MuStruct<{
            r: import("@box-local/mudb/schema").MuFloat64;
            g: import("@box-local/mudb/schema").MuFloat64;
            b: import("@box-local/mudb/schema").MuFloat64;
            a: import("@box-local/mudb/schema").MuFloat64;
        }>;
    }>;
}>>;
//# sourceMappingURL=zone-schema.d.ts.map