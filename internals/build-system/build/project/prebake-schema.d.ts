import { MuArray, MuASCII, MuBytes, MuStruct } from '@box-local/mudb/schema';
export declare const PrebakeCacheSchema: MuStruct<{
    voxelBytes: MuArray<MuBytes>;
    hotProject: MuStruct<{
        version: MuASCII;
        name: import("@box-local/mudb/schema").MuUTF8;
        blockInfoHash: MuASCII;
        blockInfo: MuStruct<{
            ids: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuRelativeVarint>;
            names: MuArray<import("@box-local/mudb/schema").MuUTF8>;
            emissive: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuVarint>;
            texture: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuRelativeVarint>;
            animLength: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuVarint>;
            friction: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuQuantizedFloat>;
            restitution: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuQuantizedFloat>;
            velocity: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuFloat32>;
            fluids: MuArray<MuStruct<{
                id: import("@box-local/mudb/schema").MuVarint;
                info: import("@box-local/mudb/schema").MuUint32;
                mass: import("@box-local/mudb/schema").MuFloat64;
            }>>;
            category: import("@box-local/mudb/schema").MuDictionary<import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuRelativeVarint>>;
            atlasRadius: import("@box-local/mudb/schema").MuVarint;
            blockBumpShift: import("@box-local/mudb/schema").MuVarint;
            blockColorShift: import("@box-local/mudb/schema").MuVarint;
            colorAtlas: MuArray<MuASCII>;
            materialAtlas: MuArray<MuASCII>;
            bumpAtlas: MuArray<MuASCII>;
        }>;
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
                skyType: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/project-rda").EnvironmentSkyType>;
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
                texture: MuASCII;
                data: MuASCII;
                chunkShift: import("@box-local/mudb/schema").MuVarint;
            }>;
        }>;
        physics: MuStruct<{
            gravity: import("@box-local/mudb/schema").MuFloat64;
            velocityDamping: import("@box-local/mudb/schema").MuFloat64;
            useOBB: import("@box-local/mudb/schema").MuBoolean;
        }>;
        player: MuStruct<{
            cameraType: MuASCII;
            scale: import("@box-local/mudb/schema").MuFloat64;
            colorLUT: import("@box-local/mudb/schema").MuUTF8;
            initialPosition: MuStruct<{
                x: import("@box-local/mudb/schema").MuFloat64;
                y: import("@box-local/mudb/schema").MuFloat64;
                z: import("@box-local/mudb/schema").MuFloat64;
            }>;
            initialYaw: import("@box-local/mudb/schema").MuFloat32;
            movementBounds: MuStruct<{
                lo: MuStruct<{
                    x: import("@box-local/mudb/schema").MuFloat64;
                    y: import("@box-local/mudb/schema").MuFloat64;
                    z: import("@box-local/mudb/schema").MuFloat64;
                }>;
                hi: MuStruct<{
                    x: import("@box-local/mudb/schema").MuFloat64;
                    y: import("@box-local/mudb/schema").MuFloat64;
                    z: import("@box-local/mudb/schema").MuFloat64;
                }>;
            }>;
            allowFlight: import("@box-local/mudb/schema").MuBoolean;
            allowMove: import("@box-local/mudb/schema").MuBoolean;
            allowAction0: import("@box-local/mudb/schema").MuBoolean;
            allowAction1: import("@box-local/mudb/schema").MuBoolean;
            allowJump: import("@box-local/mudb/schema").MuBoolean;
            allowDoubleJump: import("@box-local/mudb/schema").MuBoolean;
            allowCrouch: import("@box-local/mudb/schema").MuBoolean;
            noClip: import("@box-local/mudb/schema").MuBoolean;
            walkSpeed: import("@box-local/mudb/schema").MuFloat32;
            walkAcceleration: import("@box-local/mudb/schema").MuFloat32;
            runSpeed: import("@box-local/mudb/schema").MuFloat32;
            runAcceleration: import("@box-local/mudb/schema").MuFloat32;
            crouchSpeed: import("@box-local/mudb/schema").MuFloat32;
            crouchAcceleration: import("@box-local/mudb/schema").MuFloat32;
            swimSpeed: import("@box-local/mudb/schema").MuFloat32;
            swimAcceleration: import("@box-local/mudb/schema").MuFloat32;
            flySpeed: import("@box-local/mudb/schema").MuFloat32;
            flyAcceleration: import("@box-local/mudb/schema").MuFloat32;
            jumpSpeedFactor: import("@box-local/mudb/schema").MuFloat32;
            jumpAccelerationFactor: import("@box-local/mudb/schema").MuFloat32;
            jumpPower: import("@box-local/mudb/schema").MuFloat32;
            doubleJumpPower: import("@box-local/mudb/schema").MuFloat32;
            mass: import("@box-local/mudb/schema").MuFloat64;
            friction: import("@box-local/mudb/schema").MuFloat64;
            restitution: import("@box-local/mudb/schema").MuFloat64;
            color: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
            emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
            shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
            metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
            invisible: import("@box-local/mudb/schema").MuBoolean;
            showName: import("@box-local/mudb/schema").MuBoolean;
            showIndicator: import("@box-local/mudb/schema").MuBoolean;
            damage: MuStruct<{
                enabled: import("@box-local/mudb/schema").MuBoolean;
                showHealth: import("@box-local/mudb/schema").MuBoolean;
                showDamage: import("@box-local/mudb/schema").MuBoolean;
                hp: import("@box-local/mudb/schema").MuVarint;
                maxHp: import("@box-local/mudb/schema").MuVarint;
            }>;
            sounds: MuStruct<{
                chat: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                hurt: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                die: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                interact: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
            }>;
            playerSounds: MuStruct<{
                spawn: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                jump: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                doubleJump: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                land: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                crouch: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                step: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                action0: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                action1: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                swim: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                enterWater: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                leaveWater: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                startFly: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                endFly: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                music: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
            }>;
        }>;
        voxels: MuStruct<{
            shape: MuStruct<{
                x: import("@box-local/mudb/schema").MuUint16;
                y: import("@box-local/mudb/schema").MuUint16;
                z: import("@box-local/mudb/schema").MuUint16;
            }>;
            chunks: MuArray<MuASCII>;
        }>;
        seeds: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            name: import("@box-local/mudb/schema").MuUTF8;
            tags: MuArray<import("@box-local/mudb/schema").MuUTF8>;
            editLock: import("@box-local/mudb/schema").MuBoolean;
            staticShadow: import("@box-local/mudb/schema").MuBoolean;
            position: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
            collision: import("@box-local/mudb/schema").MuBoolean;
            gravity: import("@box-local/mudb/schema").MuBoolean;
            fixed: import("@box-local/mudb/schema").MuBoolean;
            mass: import("@box-local/mudb/schema").MuFloat64;
            friction: import("@box-local/mudb/schema").MuFloat64;
            restitution: import("@box-local/mudb/schema").MuFloat64;
            bounds: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec3>;
            meshId: import("@box-local/mudb/schema").MuFloat64;
            mesh: import("@box-local/mudb/schema").MuUTF8;
            scale: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
            orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
            tint: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec4>;
            metalness: import("@box-local/mudb/schema").MuFloat64;
            shininess: import("@box-local/mudb/schema").MuFloat64;
            emissive: import("@box-local/mudb/schema").MuFloat64;
            defaultMotionId: MuASCII;
            particle: MuStruct<{
                rate: import("@box-local/mudb/schema").MuFloat64;
                rateSpread: import("@box-local/mudb/schema").MuFloat64;
                limit: import("@box-local/mudb/schema").MuVarint;
                lifetime: import("@box-local/mudb/schema").MuFloat64;
                lifetimeSpread: import("@box-local/mudb/schema").MuFloat64;
                color0: MuStruct<{
                    r: import("@box-local/mudb/schema").MuFloat64;
                    g: import("@box-local/mudb/schema").MuFloat64;
                    b: import("@box-local/mudb/schema").MuFloat64;
                }>;
                color1: MuStruct<{
                    r: import("@box-local/mudb/schema").MuFloat64;
                    g: import("@box-local/mudb/schema").MuFloat64;
                    b: import("@box-local/mudb/schema").MuFloat64;
                }>;
                color2: MuStruct<{
                    r: import("@box-local/mudb/schema").MuFloat64;
                    g: import("@box-local/mudb/schema").MuFloat64;
                    b: import("@box-local/mudb/schema").MuFloat64;
                }>;
                color3: MuStruct<{
                    r: import("@box-local/mudb/schema").MuFloat64;
                    g: import("@box-local/mudb/schema").MuFloat64;
                    b: import("@box-local/mudb/schema").MuFloat64;
                }>;
                color4: MuStruct<{
                    r: import("@box-local/mudb/schema").MuFloat64;
                    g: import("@box-local/mudb/schema").MuFloat64;
                    b: import("@box-local/mudb/schema").MuFloat64;
                }>;
                size0: import("@box-local/mudb/schema").MuFloat32;
                size1: import("@box-local/mudb/schema").MuFloat32;
                size2: import("@box-local/mudb/schema").MuFloat32;
                size3: import("@box-local/mudb/schema").MuFloat32;
                size4: import("@box-local/mudb/schema").MuFloat32;
                sizeSpread: import("@box-local/mudb/schema").MuFloat64;
                velocity: MuStruct<{
                    x: import("@box-local/mudb/schema").MuFloat64;
                    y: import("@box-local/mudb/schema").MuFloat64;
                    z: import("@box-local/mudb/schema").MuFloat64;
                }>;
                velocitySpread: MuStruct<{
                    x: import("@box-local/mudb/schema").MuFloat64;
                    y: import("@box-local/mudb/schema").MuFloat64;
                    z: import("@box-local/mudb/schema").MuFloat64;
                }>;
                acceleration: MuStruct<{
                    x: import("@box-local/mudb/schema").MuFloat64;
                    y: import("@box-local/mudb/schema").MuFloat64;
                    z: import("@box-local/mudb/schema").MuFloat64;
                }>;
                damping: import("@box-local/mudb/schema").MuFloat64;
                noiseAmpl: import("@box-local/mudb/schema").MuFloat64;
                noiseFreq: import("@box-local/mudb/schema").MuFloat64;
            }>;
            damage: MuStruct<{
                enabled: import("@box-local/mudb/schema").MuBoolean;
                showHealth: import("@box-local/mudb/schema").MuBoolean;
                showDamage: import("@box-local/mudb/schema").MuBoolean;
                hp: import("@box-local/mudb/schema").MuVarint;
                maxHp: import("@box-local/mudb/schema").MuVarint;
            }>;
            sound: MuStruct<{
                chat: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                hurt: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                die: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                interact: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
            }>;
        }>>;
        assets: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            type: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/group-project/rda").AssetType>;
            hash: MuASCII;
            size: import("@box-local/mudb/schema").MuVarint;
            previewImage: MuASCII;
            ownerId: import("@box-local/mudb/schema").MuVarint;
            contentId: import("@box-local/mudb/schema").MuFloat64;
            bounds: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec3>;
            animated: import("@box-local/mudb/schema").MuBoolean;
        }>>;
        audioAssets: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            type: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/group-project/rda").AssetType>;
            hash: MuASCII;
            size: import("@box-local/mudb/schema").MuVarint;
            previewImage: MuASCII;
            id: MuASCII;
            updateAt: import("@box-local/mudb/schema").MuFloat64;
        }>>;
        sound: MuStruct<{
            ambient: MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
            breakVoxel: MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
            placeVoxel: MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
            playerJoin: MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
            playerLeave: MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
        }>;
        features: MuStruct<{
            enableTriggerAPI: import("@box-local/mudb/schema").MuBoolean;
        }>;
        zones: MuArray<MuStruct<{
            bounds: MuStruct<{
                lox: import("@box-local/mudb/schema").MuFloat64;
                loy: import("@box-local/mudb/schema").MuFloat64;
                loz: import("@box-local/mudb/schema").MuFloat64;
                hix: import("@box-local/mudb/schema").MuFloat64;
                hiy: import("@box-local/mudb/schema").MuFloat64;
                hiz: import("@box-local/mudb/schema").MuFloat64;
            }>;
            selector: import("@box-local/mudb/schema").MuUTF8;
            massScale: import("@box-local/mudb/schema").MuFloat64;
            force: MuStruct<{
                x: import("@box-local/mudb/schema").MuFloat64;
                y: import("@box-local/mudb/schema").MuFloat64;
                z: import("@box-local/mudb/schema").MuFloat64;
            }>;
            overrideFog: import("@box-local/mudb/schema").MuBoolean;
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
            overrideSky: import("@box-local/mudb/schema").MuBoolean;
            sky: MuStruct<{
                skyType: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/project-rda").EnvironmentSkyType>;
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
            overrideSnow: import("@box-local/mudb/schema").MuBoolean;
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
            overrideRain: import("@box-local/mudb/schema").MuBoolean;
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
        gamepad: MuStruct<{
            joystick: MuStruct<{
                background: import("@box-local/mudb/schema").MuUTF8;
                controller: import("@box-local/mudb/schema").MuUTF8;
            }>;
            fly: MuStruct<{
                button: import("@box-local/mudb/schema").MuUTF8;
                flyingController: import("@box-local/mudb/schema").MuUTF8;
                flyingBackground: import("@box-local/mudb/schema").MuUTF8;
            }>;
            buttons: MuStruct<{
                jump: import("@box-local/mudb/schema").MuUTF8;
                crouch: import("@box-local/mudb/schema").MuUTF8;
                actionA: import("@box-local/mudb/schema").MuUTF8;
                actionB: import("@box-local/mudb/schema").MuUTF8;
            }>;
        }>;
        collisionRules: MuArray<MuStruct<{
            a: import("@box-local/mudb/schema").MuUTF8;
            b: import("@box-local/mudb/schema").MuUTF8;
        }>>;
        soundAssets: MuStruct<{
            hashes: MuArray<MuASCII>;
            hashId: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuVarint>;
        }>;
        meshAssets: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            hash: MuASCII;
            meshHash: MuASCII;
            bounds: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec3>;
            hashType: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/hot-schema").HashType>;
            motionList: MuArray<MuStruct<{
                id: MuASCII;
                name: import("@box-local/mudb/schema").MuUTF8;
                duration: import("@box-local/mudb/schema").MuFloat32;
            }>>;
            useCustomBounds: import("@box-local/mudb/schema").MuBoolean;
            customBounds: MuStruct<{
                size: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec3>;
                offset: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec3>;
            }>;
            renderBoxOffset: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec3>;
        }>>;
        modules: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            hash: MuASCII;
            isClient: import("@box-local/mudb/schema").MuBoolean;
        }>>;
        scriptIndex: import("@box-local/mudb/schema").MuUTF8;
        uiTree: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            id: MuASCII;
            type: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/murda-tree").TreeNodeType>;
            name: import("@box-local/mudb/schema").MuUTF8;
            parentId: MuASCII;
            childrenIds: MuArray<MuASCII>;
            value: import("@box-local/mudb/schema").MuOption<import("@box-local/mudb/schema").MuUnion<{
                screen: MuStruct<{
                    enable: import("@box-local/mudb/schema").MuBoolean;
                    layout: import("@box-local/mudb/schema").MuUnion<{
                        none: import("@box-local/mudb/schema").MuVoid;
                        autoLayout: MuStruct<{
                            cellSize: MuStruct<{
                                offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                            columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                            startCorner: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                            fillDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                            maxCells: import("@box-local/mudb/schema").MuVarint;
                            maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                            cellPadding: MuStruct<{
                                offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                            verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                        }>;
                    }>;
                    zIndex: import("@box-local/mudb/schema").MuVarint;
                }>;
                element: import("@box-local/mudb/schema").MuUnion<{
                    box: MuStruct<{
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: MuStruct<{
                                cellSize: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                    }>;
                    image: MuStruct<{
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: MuStruct<{
                                cellSize: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        image: import("@box-local/mudb/schema").MuUTF8;
                        imageOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        imageDisplayMode: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").ImageDisplayMode>;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                    }>;
                    text: MuStruct<{
                        richText: import("@box-local/mudb/schema").MuBoolean;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textStrokeColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        textStrokeOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textStrokeThickness: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textFontFamily: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").UITextFontFamily>;
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: MuStruct<{
                                cellSize: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        textContent: import("@box-local/mudb/schema").MuUTF8;
                        textFontSize: import("@box-local/mudb/schema").MuUint8;
                        textColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        textOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textXAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").TextXAlignType>;
                        textYAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").TextYAlignType>;
                        textLineHeight: import("@box-local/mudb/schema").MuQuantizedFloat;
                        autoWordWrap: import("@box-local/mudb/schema").MuBoolean;
                    }>;
                    scrollBox: MuStruct<{
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: MuStruct<{
                                cellSize: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        scrollDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").UIScrollDirection>;
                        scrollbarHorizontal: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").UIScrollbarHorizontal>;
                        scrollbarVertical: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").UIScrollbarVertical>;
                        scrollbarVisibility: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").UIScrollbarVisibility>;
                        scrollbarThickness: import("@box-local/mudb/schema").MuVarint;
                        scrollbarColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        scrollbarOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        scrollCanvasAutoResize: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        scrollCanvasSize: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        scrollPosition: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                    }>;
                    input: MuStruct<{
                        textStrokeColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        textStrokeOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textStrokeThickness: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textFontFamily: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").UITextFontFamily>;
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: MuStruct<{
                                cellSize: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        textContent: import("@box-local/mudb/schema").MuUTF8;
                        textFontSize: import("@box-local/mudb/schema").MuUint8;
                        textColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        textOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textXAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").TextXAlignType>;
                        textYAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").TextYAlignType>;
                        textLineHeight: import("@box-local/mudb/schema").MuQuantizedFloat;
                        autoWordWrap: import("@box-local/mudb/schema").MuBoolean;
                        placeholder: import("@box-local/mudb/schema").MuUTF8;
                        placeholderColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        placeholderOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                    }>;
                }>;
            }>>;
        }>>;
        defaultScreenId: import("@box-local/mudb/schema").MuUTF8;
        pictureAssets: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            metadataHash: MuASCII;
            hash: MuASCII;
            width: import("@box-local/mudb/schema").MuInt32;
            height: import("@box-local/mudb/schema").MuInt32;
        }>>;
        skinAssets: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            hash: MuASCII;
            parts: MuStruct<{
                hips: MuASCII;
                torso: MuASCII;
                neck: MuASCII;
                head: MuASCII;
                leftShoulder: MuASCII;
                leftUpperArm: MuASCII;
                leftLowerArm: MuASCII;
                leftHand: MuASCII;
                rightShoulder: MuASCII;
                rightUpperArm: MuASCII;
                rightLowerArm: MuASCII;
                rightHand: MuASCII;
                leftUpperLeg: MuASCII;
                leftLowerLeg: MuASCII;
                leftFoot: MuASCII;
                rightUpperLeg: MuASCII;
                rightLowerLeg: MuASCII;
                rightFoot: MuASCII;
            }>;
        }>>;
        defaultSkinName: import("@box-local/mudb/schema").MuUTF8;
    }>;
    coldProject: MuStruct<{
        uiTree: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            id: MuASCII;
            type: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/murda-tree").TreeNodeType>;
            name: import("@box-local/mudb/schema").MuUTF8;
            parentId: MuASCII;
            childrenIds: MuArray<MuASCII>;
            value: import("@box-local/mudb/schema").MuOption<import("@box-local/mudb/schema").MuUnion<{
                screen: MuStruct<{
                    enable: import("@box-local/mudb/schema").MuBoolean;
                    layout: import("@box-local/mudb/schema").MuUnion<{
                        none: import("@box-local/mudb/schema").MuVoid;
                        autoLayout: MuStruct<{
                            cellSize: MuStruct<{
                                offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                            columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                            startCorner: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                            fillDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                            maxCells: import("@box-local/mudb/schema").MuVarint;
                            maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                            cellPadding: MuStruct<{
                                offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                            verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                        }>;
                    }>;
                    zIndex: import("@box-local/mudb/schema").MuVarint;
                }>;
                element: import("@box-local/mudb/schema").MuUnion<{
                    box: MuStruct<{
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: MuStruct<{
                                cellSize: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                    }>;
                    image: MuStruct<{
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: MuStruct<{
                                cellSize: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        image: import("@box-local/mudb/schema").MuUTF8;
                        imageOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        imageDisplayMode: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").ImageDisplayMode>;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                    }>;
                    text: MuStruct<{
                        richText: import("@box-local/mudb/schema").MuBoolean;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textStrokeColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        textStrokeOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textStrokeThickness: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textFontFamily: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").UITextFontFamily>;
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: MuStruct<{
                                cellSize: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        textContent: import("@box-local/mudb/schema").MuUTF8;
                        textFontSize: import("@box-local/mudb/schema").MuUint8;
                        textColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        textOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textXAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").TextXAlignType>;
                        textYAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").TextYAlignType>;
                        textLineHeight: import("@box-local/mudb/schema").MuQuantizedFloat;
                        autoWordWrap: import("@box-local/mudb/schema").MuBoolean;
                    }>;
                    scrollBox: MuStruct<{
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: MuStruct<{
                                cellSize: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        scrollDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").UIScrollDirection>;
                        scrollbarHorizontal: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").UIScrollbarHorizontal>;
                        scrollbarVertical: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").UIScrollbarVertical>;
                        scrollbarVisibility: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").UIScrollbarVisibility>;
                        scrollbarThickness: import("@box-local/mudb/schema").MuVarint;
                        scrollbarColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        scrollbarOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        scrollCanvasAutoResize: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        scrollCanvasSize: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        scrollPosition: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                    }>;
                    input: MuStruct<{
                        textStrokeColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        textStrokeOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textStrokeThickness: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textFontFamily: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").UITextFontFamily>;
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: MuStruct<{
                                cellSize: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        textContent: import("@box-local/mudb/schema").MuUTF8;
                        textFontSize: import("@box-local/mudb/schema").MuUint8;
                        textColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        textOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textXAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").TextXAlignType>;
                        textYAlignment: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/ui-rda/defs").TextYAlignType>;
                        textLineHeight: import("@box-local/mudb/schema").MuQuantizedFloat;
                        autoWordWrap: import("@box-local/mudb/schema").MuBoolean;
                        placeholder: import("@box-local/mudb/schema").MuUTF8;
                        placeholderColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        placeholderOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                    }>;
                }>;
            }>>;
        }>>;
        audioAssets: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            type: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/group-project/rda").AssetType>;
            hash: MuASCII;
            size: import("@box-local/mudb/schema").MuVarint;
            previewImage: MuASCII;
            id: MuASCII;
            updateAt: import("@box-local/mudb/schema").MuFloat64;
        }>>;
        pictureAssets: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            type: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/group-project/rda").AssetType>;
            hash: MuASCII;
            size: import("@box-local/mudb/schema").MuVarint;
            previewImage: MuASCII;
            id: MuASCII;
            updateAt: import("@box-local/mudb/schema").MuFloat64;
        }>>;
        type: import("@box-local/mudb/schema").MuUTF8;
        version: import("@box-local/mudb/schema").MuUTF8;
        prevHash: MuASCII;
        timestamp: import("@box-local/mudb/schema").MuDate;
        storageMode: import("@box-local/mudb/schema").MuUTF8;
        features: MuStruct<{
            enableTriggerAPI: import("@box-local/mudb/schema").MuBoolean;
        }>;
        info: MuStruct<{
            displayName: import("@box-local/mudb/schema").MuUTF8;
            description: import("@box-local/mudb/schema").MuUTF8;
            previewImage: MuASCII;
            bannerImages: MuArray<MuASCII>;
            notice: import("@box-local/mudb/schema").MuUTF8;
            isNeverChangeDisplayName: import("@box-local/mudb/schema").MuBoolean;
        }>;
        voxels: MuStruct<{
            shape: MuStruct<{
                x: import("@box-local/mudb/schema").MuUint16;
                y: import("@box-local/mudb/schema").MuUint16;
                z: import("@box-local/mudb/schema").MuUint16;
            }>;
            chunks: MuArray<MuASCII>;
        }>;
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
                skyType: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/project-rda").EnvironmentSkyType>;
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
                texture: MuASCII;
                data: MuASCII;
                chunkShift: import("@box-local/mudb/schema").MuVarint;
            }>;
        }>;
        ambientSound: MuStruct<{
            ambient: MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
            breakVoxel: MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
            placeVoxel: MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
            playerJoin: MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
            playerLeave: MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
        }>;
        physics: MuStruct<{
            gravity: import("@box-local/mudb/schema").MuFloat64;
            velocityDamping: import("@box-local/mudb/schema").MuFloat64;
            useOBB: import("@box-local/mudb/schema").MuBoolean;
        }>;
        collisionFilter: MuArray<MuStruct<{
            selectorA: import("@box-local/mudb/schema").MuUTF8;
            selectorB: import("@box-local/mudb/schema").MuUTF8;
        }>>;
        player: MuStruct<{
            cameraType: MuASCII;
            scale: import("@box-local/mudb/schema").MuFloat64;
            colorLUT: import("@box-local/mudb/schema").MuUTF8;
            initialPosition: MuStruct<{
                x: import("@box-local/mudb/schema").MuFloat64;
                y: import("@box-local/mudb/schema").MuFloat64;
                z: import("@box-local/mudb/schema").MuFloat64;
            }>;
            initialYaw: import("@box-local/mudb/schema").MuFloat32;
            movementBounds: MuStruct<{
                lo: MuStruct<{
                    x: import("@box-local/mudb/schema").MuFloat64;
                    y: import("@box-local/mudb/schema").MuFloat64;
                    z: import("@box-local/mudb/schema").MuFloat64;
                }>;
                hi: MuStruct<{
                    x: import("@box-local/mudb/schema").MuFloat64;
                    y: import("@box-local/mudb/schema").MuFloat64;
                    z: import("@box-local/mudb/schema").MuFloat64;
                }>;
            }>;
            allowFlight: import("@box-local/mudb/schema").MuBoolean;
            allowMove: import("@box-local/mudb/schema").MuBoolean;
            allowAction0: import("@box-local/mudb/schema").MuBoolean;
            allowAction1: import("@box-local/mudb/schema").MuBoolean;
            allowJump: import("@box-local/mudb/schema").MuBoolean;
            allowDoubleJump: import("@box-local/mudb/schema").MuBoolean;
            allowCrouch: import("@box-local/mudb/schema").MuBoolean;
            noClip: import("@box-local/mudb/schema").MuBoolean;
            walkSpeed: import("@box-local/mudb/schema").MuFloat32;
            walkAcceleration: import("@box-local/mudb/schema").MuFloat32;
            runSpeed: import("@box-local/mudb/schema").MuFloat32;
            runAcceleration: import("@box-local/mudb/schema").MuFloat32;
            crouchSpeed: import("@box-local/mudb/schema").MuFloat32;
            crouchAcceleration: import("@box-local/mudb/schema").MuFloat32;
            swimSpeed: import("@box-local/mudb/schema").MuFloat32;
            swimAcceleration: import("@box-local/mudb/schema").MuFloat32;
            flySpeed: import("@box-local/mudb/schema").MuFloat32;
            flyAcceleration: import("@box-local/mudb/schema").MuFloat32;
            jumpSpeedFactor: import("@box-local/mudb/schema").MuFloat32;
            jumpAccelerationFactor: import("@box-local/mudb/schema").MuFloat32;
            jumpPower: import("@box-local/mudb/schema").MuFloat32;
            doubleJumpPower: import("@box-local/mudb/schema").MuFloat32;
            mass: import("@box-local/mudb/schema").MuFloat64;
            friction: import("@box-local/mudb/schema").MuFloat64;
            restitution: import("@box-local/mudb/schema").MuFloat64;
            color: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
            emissive: import("@box-local/mudb/schema").MuQuantizedFloat;
            shininess: import("@box-local/mudb/schema").MuQuantizedFloat;
            metalness: import("@box-local/mudb/schema").MuQuantizedFloat;
            invisible: import("@box-local/mudb/schema").MuBoolean;
            showName: import("@box-local/mudb/schema").MuBoolean;
            showIndicator: import("@box-local/mudb/schema").MuBoolean;
            damage: MuStruct<{
                enabled: import("@box-local/mudb/schema").MuBoolean;
                showHealth: import("@box-local/mudb/schema").MuBoolean;
                showDamage: import("@box-local/mudb/schema").MuBoolean;
                hp: import("@box-local/mudb/schema").MuVarint;
                maxHp: import("@box-local/mudb/schema").MuVarint;
            }>;
            sounds: MuStruct<{
                chat: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                hurt: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                die: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                interact: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
            }>;
            playerSounds: MuStruct<{
                spawn: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                jump: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                doubleJump: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                land: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                crouch: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                step: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                action0: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                action1: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                swim: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                enterWater: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                leaveWater: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                startFly: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                endFly: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                music: MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
            }>;
        }>;
        entitiesTree: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            id: MuASCII;
            type: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/murda-tree").TreeNodeType>;
            name: import("@box-local/mudb/schema").MuUTF8;
            parentId: MuASCII;
            childrenIds: MuArray<MuASCII>;
            value: import("@box-local/mudb/schema").MuOption<MuStruct<{
                name: import("@box-local/mudb/schema").MuUTF8;
                tags: MuArray<import("@box-local/mudb/schema").MuUTF8>;
                editLock: import("@box-local/mudb/schema").MuBoolean;
                staticShadow: import("@box-local/mudb/schema").MuBoolean;
                position: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                collision: import("@box-local/mudb/schema").MuBoolean;
                gravity: import("@box-local/mudb/schema").MuBoolean;
                fixed: import("@box-local/mudb/schema").MuBoolean;
                mass: import("@box-local/mudb/schema").MuFloat64;
                friction: import("@box-local/mudb/schema").MuFloat64;
                restitution: import("@box-local/mudb/schema").MuFloat64;
                bounds: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec3>;
                meshId: import("@box-local/mudb/schema").MuFloat64;
                mesh: import("@box-local/mudb/schema").MuUTF8;
                scale: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                orientation: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").quat>;
                tint: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec4>;
                metalness: import("@box-local/mudb/schema").MuFloat64;
                shininess: import("@box-local/mudb/schema").MuFloat64;
                emissive: import("@box-local/mudb/schema").MuFloat64;
                defaultMotionId: MuASCII;
                particle: MuStruct<{
                    rate: import("@box-local/mudb/schema").MuFloat64;
                    rateSpread: import("@box-local/mudb/schema").MuFloat64;
                    limit: import("@box-local/mudb/schema").MuVarint;
                    lifetime: import("@box-local/mudb/schema").MuFloat64;
                    lifetimeSpread: import("@box-local/mudb/schema").MuFloat64;
                    color0: MuStruct<{
                        r: import("@box-local/mudb/schema").MuFloat64;
                        g: import("@box-local/mudb/schema").MuFloat64;
                        b: import("@box-local/mudb/schema").MuFloat64;
                    }>;
                    color1: MuStruct<{
                        r: import("@box-local/mudb/schema").MuFloat64;
                        g: import("@box-local/mudb/schema").MuFloat64;
                        b: import("@box-local/mudb/schema").MuFloat64;
                    }>;
                    color2: MuStruct<{
                        r: import("@box-local/mudb/schema").MuFloat64;
                        g: import("@box-local/mudb/schema").MuFloat64;
                        b: import("@box-local/mudb/schema").MuFloat64;
                    }>;
                    color3: MuStruct<{
                        r: import("@box-local/mudb/schema").MuFloat64;
                        g: import("@box-local/mudb/schema").MuFloat64;
                        b: import("@box-local/mudb/schema").MuFloat64;
                    }>;
                    color4: MuStruct<{
                        r: import("@box-local/mudb/schema").MuFloat64;
                        g: import("@box-local/mudb/schema").MuFloat64;
                        b: import("@box-local/mudb/schema").MuFloat64;
                    }>;
                    size0: import("@box-local/mudb/schema").MuFloat32;
                    size1: import("@box-local/mudb/schema").MuFloat32;
                    size2: import("@box-local/mudb/schema").MuFloat32;
                    size3: import("@box-local/mudb/schema").MuFloat32;
                    size4: import("@box-local/mudb/schema").MuFloat32;
                    sizeSpread: import("@box-local/mudb/schema").MuFloat64;
                    velocity: MuStruct<{
                        x: import("@box-local/mudb/schema").MuFloat64;
                        y: import("@box-local/mudb/schema").MuFloat64;
                        z: import("@box-local/mudb/schema").MuFloat64;
                    }>;
                    velocitySpread: MuStruct<{
                        x: import("@box-local/mudb/schema").MuFloat64;
                        y: import("@box-local/mudb/schema").MuFloat64;
                        z: import("@box-local/mudb/schema").MuFloat64;
                    }>;
                    acceleration: MuStruct<{
                        x: import("@box-local/mudb/schema").MuFloat64;
                        y: import("@box-local/mudb/schema").MuFloat64;
                        z: import("@box-local/mudb/schema").MuFloat64;
                    }>;
                    damping: import("@box-local/mudb/schema").MuFloat64;
                    noiseAmpl: import("@box-local/mudb/schema").MuFloat64;
                    noiseFreq: import("@box-local/mudb/schema").MuFloat64;
                }>;
                damage: MuStruct<{
                    enabled: import("@box-local/mudb/schema").MuBoolean;
                    showHealth: import("@box-local/mudb/schema").MuBoolean;
                    showDamage: import("@box-local/mudb/schema").MuBoolean;
                    hp: import("@box-local/mudb/schema").MuVarint;
                    maxHp: import("@box-local/mudb/schema").MuVarint;
                }>;
                sound: MuStruct<{
                    chat: MuStruct<{
                        sample: import("@box-local/mudb/schema").MuUTF8;
                        radius: import("@box-local/mudb/schema").MuFloat32;
                        pitch: import("@box-local/mudb/schema").MuFloat32;
                        pitchRange: import("@box-local/mudb/schema").MuFloat32;
                        gain: import("@box-local/mudb/schema").MuFloat32;
                        gainRange: import("@box-local/mudb/schema").MuFloat32;
                    }>;
                    hurt: MuStruct<{
                        sample: import("@box-local/mudb/schema").MuUTF8;
                        radius: import("@box-local/mudb/schema").MuFloat32;
                        pitch: import("@box-local/mudb/schema").MuFloat32;
                        pitchRange: import("@box-local/mudb/schema").MuFloat32;
                        gain: import("@box-local/mudb/schema").MuFloat32;
                        gainRange: import("@box-local/mudb/schema").MuFloat32;
                    }>;
                    die: MuStruct<{
                        sample: import("@box-local/mudb/schema").MuUTF8;
                        radius: import("@box-local/mudb/schema").MuFloat32;
                        pitch: import("@box-local/mudb/schema").MuFloat32;
                        pitchRange: import("@box-local/mudb/schema").MuFloat32;
                        gain: import("@box-local/mudb/schema").MuFloat32;
                        gainRange: import("@box-local/mudb/schema").MuFloat32;
                    }>;
                    interact: MuStruct<{
                        sample: import("@box-local/mudb/schema").MuUTF8;
                        radius: import("@box-local/mudb/schema").MuFloat32;
                        pitch: import("@box-local/mudb/schema").MuFloat32;
                        pitchRange: import("@box-local/mudb/schema").MuFloat32;
                        gain: import("@box-local/mudb/schema").MuFloat32;
                        gainRange: import("@box-local/mudb/schema").MuFloat32;
                    }>;
                }>;
            }>>;
        }>>;
        scriptIndex: import("@box-local/mudb/schema").MuUTF8;
        zones: MuArray<MuStruct<{
            bounds: MuStruct<{
                lox: import("@box-local/mudb/schema").MuFloat64;
                loy: import("@box-local/mudb/schema").MuFloat64;
                loz: import("@box-local/mudb/schema").MuFloat64;
                hix: import("@box-local/mudb/schema").MuFloat64;
                hiy: import("@box-local/mudb/schema").MuFloat64;
                hiz: import("@box-local/mudb/schema").MuFloat64;
            }>;
            selector: import("@box-local/mudb/schema").MuUTF8;
            massScale: import("@box-local/mudb/schema").MuFloat64;
            force: MuStruct<{
                x: import("@box-local/mudb/schema").MuFloat64;
                y: import("@box-local/mudb/schema").MuFloat64;
                z: import("@box-local/mudb/schema").MuFloat64;
            }>;
            overrideFog: import("@box-local/mudb/schema").MuBoolean;
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
            overrideSky: import("@box-local/mudb/schema").MuBoolean;
            sky: MuStruct<{
                skyType: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/project/project-rda").EnvironmentSkyType>;
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
            overrideSnow: import("@box-local/mudb/schema").MuBoolean;
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
            overrideRain: import("@box-local/mudb/schema").MuBoolean;
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
        gamepad: MuStruct<{
            joystick: MuStruct<{
                background: import("@box-local/mudb/schema").MuUTF8;
                controller: import("@box-local/mudb/schema").MuUTF8;
            }>;
            fly: MuStruct<{
                button: import("@box-local/mudb/schema").MuUTF8;
                flyingController: import("@box-local/mudb/schema").MuUTF8;
                flyingBackground: import("@box-local/mudb/schema").MuUTF8;
            }>;
            buttons: MuStruct<{
                jump: import("@box-local/mudb/schema").MuUTF8;
                crouch: import("@box-local/mudb/schema").MuUTF8;
                actionA: import("@box-local/mudb/schema").MuUTF8;
                actionB: import("@box-local/mudb/schema").MuUTF8;
            }>;
        }>;
        assets: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            type: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/group-project/rda").AssetType>;
            hash: MuASCII;
            size: import("@box-local/mudb/schema").MuVarint;
            previewImage: MuASCII;
            ownerId: import("@box-local/mudb/schema").MuVarint;
            contentId: import("@box-local/mudb/schema").MuFloat64;
            bounds: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec3>;
            animated: import("@box-local/mudb/schema").MuBoolean;
        }>>;
        deleteAssets: MuArray<MuStruct<{
            key: import("@box-local/mudb/schema").MuUTF8;
            value: MuStruct<{
                type: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/group-project/rda").AssetType>;
                hash: MuASCII;
                size: import("@box-local/mudb/schema").MuVarint;
                previewImage: MuASCII;
                ownerId: import("@box-local/mudb/schema").MuVarint;
                contentId: import("@box-local/mudb/schema").MuFloat64;
                bounds: import("@box-local/mudb/schema").MuSchema<import("gl-matrix").vec3>;
                animated: import("@box-local/mudb/schema").MuBoolean;
            }>;
        }>>;
        committerId: import("@box-local/mudb/schema").MuVarint;
        defaultScreenId: import("@box-local/mudb/schema").MuUTF8;
    }>;
    permissions: MuStruct<{
        type: import("@box-local/mudb/schema").MuUTF8;
        version: MuASCII;
        prevHash: MuASCII;
        timestamp: import("@box-local/mudb/schema").MuDate;
        versionControl: MuStruct<{
            branches: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
                name: import("@box-local/mudb/schema").MuUTF8;
                headHash: MuASCII;
            }>>;
            currentBranch: import("@box-local/mudb/schema").MuUTF8;
        }>;
        groups: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            permissions: MuStruct<{
                publish: import("@box-local/mudb/schema").MuBoolean;
                playButton: import("@box-local/mudb/schema").MuBoolean;
                debugger: import("@box-local/mudb/schema").MuBoolean;
                editScripts: import("@box-local/mudb/schema").MuBoolean;
                editProject: import("@box-local/mudb/schema").MuBoolean;
                editModel: import("@box-local/mudb/schema").MuBoolean;
                editScene: import("@box-local/mudb/schema").MuBoolean;
                editFile: import("@box-local/mudb/schema").MuBoolean;
                editHierarchy: import("@box-local/mudb/schema").MuBoolean;
                editVoxels: import("@box-local/mudb/schema").MuBoolean;
                editPermissions: import("@box-local/mudb/schema").MuBoolean;
                versionControl: import("@box-local/mudb/schema").MuBoolean;
                chatEnabled: import("@box-local/mudb/schema").MuBoolean;
                editMarket: import("@box-local/mudb/schema").MuBoolean;
                editStatisticsData: import("@box-local/mudb/schema").MuBoolean;
                editPublish: import("@box-local/mudb/schema").MuBoolean;
                editPlayer: import("@box-local/mudb/schema").MuBoolean;
            }>;
            members: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
                addedAt: import("@box-local/mudb/schema").MuDate;
            }>>;
            defaultGroup: import("@box-local/mudb/schema").MuBoolean;
        }>>;
        users: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            createdAt: import("@box-local/mudb/schema").MuDate;
        }>>;
        collaborators: MuArray<import("@box-local/mudb/schema").MuUTF8>;
        owner: import("@box-local/mudb/schema").MuUTF8;
        accessLevel: import("@box-local/mudb/schema").MuSchema<import("@box-local/schema/permissions/permission-rda").PermissionAccessLevel>;
        banned: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            reason: import("@box-local/mudb/schema").MuUTF8;
            bannedBy: import("@box-local/mudb/schema").MuUTF8;
        }>>;
    }>;
    extraProjectInfo: MuStruct<{
        meshAssets: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            modelId: import("@box-local/mudb/schema").MuFloat64;
            hash: MuASCII;
            modelPreviewHash: MuASCII;
            animated: import("@box-local/mudb/schema").MuBoolean;
            updatedAt: MuASCII;
        }>>;
        skinAssets: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            hash: MuASCII;
        }>>;
        defaultSkinName: import("@box-local/mudb/schema").MuUTF8;
        scriptAssets: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
            hash: MuASCII;
            name: import("@box-local/mudb/schema").MuUTF8;
            isClient: import("@box-local/mudb/schema").MuBoolean;
            isShare: import("@box-local/mudb/schema").MuBoolean;
            order: import("@box-local/mudb/schema").MuInt32;
            lockedMapTitle: import("@box-local/mudb/schema").MuUTF8;
            lockedMapId: import("@box-local/mudb/schema").MuUint32;
            id: import("@box-local/mudb/schema").MuUTF8;
        }>>;
    }>;
    permissionsHash: MuASCII;
    projectHash: MuASCII;
}>;
export type PrebakeCache = typeof PrebakeCacheSchema.identity;
//# sourceMappingURL=prebake-schema.d.ts.map