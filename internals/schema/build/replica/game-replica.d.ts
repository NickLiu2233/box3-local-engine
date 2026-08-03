import { MuStruct, MuBoolean } from '@box-local/mudb/schema';
export declare const GameReplicaSchema: MuStruct<{
    running: MuBoolean;
    sync: MuBoolean;
    environment: MuStruct<{
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
        drawDistance: import("@box-local/mudb/schema").MuFloat32;
        bakedShadow: MuStruct<{
            texture: import("@box-local/mudb/schema").MuASCII;
            data: import("@box-local/mudb/schema").MuASCII;
            chunkShift: import("@box-local/mudb/schema").MuVarint;
        }>;
    }>;
    models: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        id: import("@box-local/mudb/schema").MuVarint;
        meshId: import("@box-local/mudb/schema").MuVarint;
        invisible: MuBoolean;
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
        motion: MuStruct<{
            defaultMotionId: import("@box-local/mudb/schema").MuASCII;
            paused: MuBoolean;
            pausedTick: import("@box-local/mudb/schema").MuFloat64;
            startTick: import("@box-local/mudb/schema").MuFloat64;
            playback: MuStruct<{
                motions: import("@box-local/mudb/schema").MuArray<MuStruct<{
                    motionId: import("@box-local/mudb/schema").MuASCII;
                    cycleCount: import("@box-local/mudb/schema").MuInt32;
                }>>;
                startTick: import("@box-local/mudb/schema").MuFloat64;
                cycleCount: import("@box-local/mudb/schema").MuInt32;
            }>;
        }>;
        staticShadow: MuBoolean;
        name: import("@box-local/mudb/schema").MuUTF8;
    }>>;
    players: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        id: import("@box-local/mudb/schema").MuVarint;
        flags: import("@box-local/mudb/schema").MuSchema<import("../player/player-schema").PlayerDisplayFlags>;
        name: import("@box-local/mudb/schema").MuUTF8;
        tag: import("@box-local/mudb/schema").MuVarint;
        avatarSkin: MuStruct<{
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
        skinInvisible: MuStruct<{
            hips: MuBoolean;
            torso: MuBoolean;
            neck: MuBoolean;
            head: MuBoolean;
            leftShoulder: MuBoolean;
            leftUpperArm: MuBoolean;
            leftLowerArm: MuBoolean;
            leftHand: MuBoolean;
            rightShoulder: MuBoolean;
            rightUpperArm: MuBoolean;
            rightLowerArm: MuBoolean;
            rightHand: MuBoolean;
            leftUpperLeg: MuBoolean;
            leftLowerLeg: MuBoolean;
            leftFoot: MuBoolean;
            rightUpperLeg: MuBoolean;
            rightLowerLeg: MuBoolean;
            rightFoot: MuBoolean;
        }>;
        mapSkin: MuStruct<{
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
        color: import("../utils/quantized-schema").QuantizedVec3Schema;
        metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
        emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
        shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
        scale: import("@box-local/mudb/schema").MuQuantizedFloat;
        attachments: MuStruct<{
            hips: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            torso: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            neck: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            head: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftShoulder: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftUpperArm: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftLowerArm: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftHand: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightShoulder: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightUpperArm: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightLowerArm: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightHand: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftUpperLeg: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftLowerLeg: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            leftFoot: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightUpperLeg: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightLowerLeg: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
            rightFoot: import("@box-local/mudb/schema").MuArray<MuStruct<{
                meshId: import("@box-local/mudb/schema").MuVarint;
                red: import("@box-local/mudb/schema").MuQuantizedFloat;
                green: import("@box-local/mudb/schema").MuQuantizedFloat;
                blue: import("@box-local/mudb/schema").MuQuantizedFloat;
                emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
                shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
                metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
                offset: import("../utils/quantized-schema").QuantizedVec3Schema;
                scale: import("../utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            }>>;
        }>;
    }>>;
    particles: MuStruct<{
        emitters: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
            countLimit: import("@box-local/mudb/schema").MuVarint;
            emitRate: import("@box-local/mudb/schema").MuQuantizedFloat;
            emitSpread: import("@box-local/mudb/schema").MuQuantizedFloat;
            lifetime: import("@box-local/mudb/schema").MuQuantizedFloat;
            lifetimeSpread: import("@box-local/mudb/schema").MuQuantizedFloat;
            velocity: import("../utils/quantized-schema").QuantizedVec3Schema;
            velocitySpread: import("../utils/quantized-schema").QuantizedVec3Schema;
            id: import("@box-local/mudb/schema").MuVarint;
            particleId: import("@box-local/mudb/schema").MuVarint;
        }>>;
        prototypes: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
            acceleration: import("../utils/quantized-schema").QuantizedVec3Schema;
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
        }>>;
    }>;
    damage: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        id: import("@box-local/mudb/schema").MuVarint;
        showHealthBar: MuBoolean;
        hp: import("@box-local/mudb/schema").MuQuantizedFloat;
        maxHp: import("@box-local/mudb/schema").MuQuantizedFloat;
    }>>;
    interactive: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        id: import("@box-local/mudb/schema").MuVarint;
        radius: import("@box-local/mudb/schema").MuQuantizedFloat;
        hint: import("@box-local/mudb/schema").MuUTF8;
        color: import("../utils/quantized-schema").QuantizedVec3Schema;
    }>>;
    entityName: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        id: import("@box-local/mudb/schema").MuVarint;
        radius: import("@box-local/mudb/schema").MuQuantizedFloat;
        name: import("@box-local/mudb/schema").MuUTF8;
        color: import("../utils/quantized-schema").QuantizedVec3Schema;
    }>>;
    sound: MuStruct<{
        ambientSound: MuStruct<{
            ambient: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            breakVoxel: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            placeVoxel: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            playerJoin: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            playerLeave: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
        }>;
        entitySound: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
            id: import("@box-local/mudb/schema").MuVarint;
            chat: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            hurt: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            die: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            interact: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
        }>>;
        playerSound: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
            id: import("@box-local/mudb/schema").MuVarint;
            spawn: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            jump: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            doubleJump: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            land: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            crouch: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            step: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            swim: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            action0: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            action1: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            enterWater: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            leaveWater: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            startFly: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
            endFly: MuStruct<{
                sampleId: import("@box-local/mudb/schema").MuVarint;
                radius: import("@box-local/mudb/schema").MuQuantizedFloat;
                gain: import("@box-local/mudb/schema").MuQuantizedFloat;
                gainRange: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitch: import("@box-local/mudb/schema").MuQuantizedFloat;
                pitchRange: import("@box-local/mudb/schema").MuQuantizedFloat;
            }>;
        }>>;
    }>;
    keyframes: MuStruct<{
        entity: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
            id: import("@box-local/mudb/schema").MuVarint;
            targetId: import("@box-local/mudb/schema").MuVarint;
            startTick: import("@box-local/mudb/schema").MuQuantizedFloat;
            endTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
            cycleTicks: import("@box-local/mudb/schema").MuQuantizedFloat;
            cyclePhase: import("@box-local/mudb/schema").MuQuantizedFloat;
            cycleCount: import("@box-local/mudb/schema").MuQuantizedFloat;
            playbackMode: import("@box-local/mudb/schema").MuSchema<import("../keyframes/type").AnimationPlaybackMode>;
            keyframes: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
                tick: import("@box-local/mudb/schema").MuQuantizedFloat;
                easeIn: import("@box-local/mudb/schema").MuSchema<import("../keyframes/type").KeyframeEaseMode>;
                easeOut: import("@box-local/mudb/schema").MuSchema<import("../keyframes/type").KeyframeEaseMode>;
                components: import("../keyframes/mu-array-union").MuArrayUnion<[import("../keyframes/mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuVarint, MuBoolean, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, MuStruct<{}>, MuStruct<{}>, import("@box-local/mudb/schema").MuUint32]>, import("../keyframes/mu-array-union").MuArrayUnion<[MuStruct<{}>, MuStruct<{} | {
                    [x: string]: import("@box-local/mudb/schema").MuQuantizedFloat;
                }>, MuStruct<{} | {
                    [x: string]: import("@box-local/mudb/schema").MuQuantizedFloat;
                }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, MuBoolean, MuBoolean, MuBoolean]>, import("../keyframes/mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, MuStruct<{
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
                }>]>, import("../keyframes/mu-array-union").MuArrayUnion<[MuStruct<{
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
                }>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuVarint, import("@box-local/mudb/schema").MuSchema<number>]>, import("../keyframes/mu-array-union").MuArrayUnion<[MuStruct<{
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
            playbackMode: import("@box-local/mudb/schema").MuSchema<import("../keyframes/type").AnimationPlaybackMode>;
            keyframes: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
                tick: import("@box-local/mudb/schema").MuQuantizedFloat;
                easeIn: import("@box-local/mudb/schema").MuSchema<import("../keyframes/type").KeyframeEaseMode>;
                easeOut: import("@box-local/mudb/schema").MuSchema<import("../keyframes/type").KeyframeEaseMode>;
                components: import("../keyframes/mu-array-union").MuArrayUnion<[import("../keyframes/mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>, MuStruct<{
                    r: import("@box-local/mudb/schema").MuQuantizedFloat;
                } & {
                    g: import("@box-local/mudb/schema").MuQuantizedFloat;
                } & {
                    b: import("@box-local/mudb/schema").MuQuantizedFloat;
                }>, MuBoolean, MuBoolean, MuBoolean]>, import("../keyframes/mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuASCII]>]>;
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
            playbackMode: import("@box-local/mudb/schema").MuSchema<import("../keyframes/type").AnimationPlaybackMode>;
            keyframes: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
                tick: import("@box-local/mudb/schema").MuQuantizedFloat;
                easeIn: import("@box-local/mudb/schema").MuSchema<import("../keyframes/type").KeyframeEaseMode>;
                easeOut: import("@box-local/mudb/schema").MuSchema<import("../keyframes/type").KeyframeEaseMode>;
                components: import("../keyframes/mu-array-union").MuArrayUnion<[import("../keyframes/mu-array-union").MuArrayUnion<[]>, import("../keyframes/mu-array-union").MuArrayUnion<[import("@box-local/mudb/schema").MuSchema<number>, import("@box-local/mudb/schema").MuSchema<number>]>]>;
            }>>;
        }>>;
    }>;
    entities: import("@box-local/mudb/schema").MuSortedArray<import("@box-local/mudb/schema").MuVarint>;
}>;
export type GameReplica = typeof GameReplicaSchema.identity;
//# sourceMappingURL=game-replica.d.ts.map