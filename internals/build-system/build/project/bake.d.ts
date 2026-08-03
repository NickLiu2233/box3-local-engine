import { BuildSystemAPI } from '../type';
import * as Cold from '@box-local/schema/project/project-rda';
import * as Hot from '@box-local/schema/project/hot-schema';
import { ContentServer } from '@box-local/content-server';
import { MuSchema } from '@box-local/mudb/schema';
import { TreeNodeType } from '@box-local/schema/project/murda-tree';
export declare function copySoundAssets(hp: Hot.HotProject): void;
export declare class ProjectBakeCache {
    blockInfoHash: string;
    content: ContentServer;
    build: BuildSystemAPI;
    meshIdSetCache: {
        [id: number]: {
            hash: string;
            path: string;
            bounds: [number, number, number];
            motionIds: string[];
        };
    };
    private _meshInfoCache;
    private _blockInfoCache;
    private _pictureInfoCache;
    private _skinInfoCache;
    constructor(content: ContentServer, build: BuildSystemAPI, blockInfoHash: string);
    destroy(): void;
    getMeshInfo(hash: string, type: Cold.AssetType): Promise<Hot.MeshAssetInfo>;
    private _retrieveImageBounds;
    private _retrieveVoxelMetaData;
    private retrieveGLTFMetaData;
    private _getPicture;
    private _getSkinAsset;
    private _getBlockInfo;
    bake(cold: Cold.ProjectInfo, extra: Hot.ExtraProjectInfo, hp_?: Hot.HotProject): Promise<import("@box-local/mudb/schema/struct").Struct<{
        version: import("@box-local/mudb/schema").MuASCII;
        name: import("@box-local/mudb/schema").MuUTF8;
        blockInfoHash: import("@box-local/mudb/schema").MuASCII;
        blockInfo: import("@box-local/mudb/schema").MuStruct<{
            ids: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuRelativeVarint>;
            names: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUTF8>;
            emissive: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuVarint>;
            texture: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuRelativeVarint>;
            animLength: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuVarint>;
            friction: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuQuantizedFloat>;
            restitution: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuQuantizedFloat>;
            velocity: import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuFloat32>;
            fluids: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuVarint;
                info: import("@box-local/mudb/schema").MuUint32;
                mass: import("@box-local/mudb/schema").MuFloat64;
            }>>;
            category: import("@box-local/mudb/schema").MuDictionary<import("@box-local/schema/utils/relative-array").RelativeArray<import("@box-local/mudb/schema").MuRelativeVarint>>;
            atlasRadius: import("@box-local/mudb/schema").MuVarint;
            blockBumpShift: import("@box-local/mudb/schema").MuVarint;
            blockColorShift: import("@box-local/mudb/schema").MuVarint;
            colorAtlas: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuASCII>;
            materialAtlas: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuASCII>;
            bumpAtlas: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuASCII>;
        }>;
        environment: import("@box-local/mudb/schema").MuStruct<{
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
                skyType: MuSchema<Cold.EnvironmentSkyType>;
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
                gamma: import("@box-local/mudb/schema").MuFloat32;
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
            drawDistance: import("@box-local/mudb/schema").MuFloat32;
            bakedShadow: import("@box-local/mudb/schema").MuStruct<{
                texture: import("@box-local/mudb/schema").MuASCII;
                data: import("@box-local/mudb/schema").MuASCII;
                chunkShift: import("@box-local/mudb/schema").MuVarint;
            }>;
        }>;
        physics: import("@box-local/mudb/schema").MuStruct<{
            gravity: import("@box-local/mudb/schema").MuFloat64;
            velocityDamping: import("@box-local/mudb/schema").MuFloat64;
            useOBB: import("@box-local/mudb/schema").MuBoolean;
        }>;
        player: import("@box-local/mudb/schema").MuStruct<{
            cameraType: import("@box-local/mudb/schema").MuASCII;
            scale: import("@box-local/mudb/schema").MuFloat64;
            colorLUT: import("@box-local/mudb/schema").MuUTF8;
            initialPosition: import("@box-local/mudb/schema").MuStruct<{
                x: import("@box-local/mudb/schema").MuFloat64;
                y: import("@box-local/mudb/schema").MuFloat64;
                z: import("@box-local/mudb/schema").MuFloat64;
            }>;
            initialYaw: import("@box-local/mudb/schema").MuFloat32;
            movementBounds: import("@box-local/mudb/schema").MuStruct<{
                lo: import("@box-local/mudb/schema").MuStruct<{
                    x: import("@box-local/mudb/schema").MuFloat64;
                    y: import("@box-local/mudb/schema").MuFloat64;
                    z: import("@box-local/mudb/schema").MuFloat64;
                }>;
                hi: import("@box-local/mudb/schema").MuStruct<{
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
            damage: import("@box-local/mudb/schema").MuStruct<{
                enabled: import("@box-local/mudb/schema").MuBoolean;
                showHealth: import("@box-local/mudb/schema").MuBoolean;
                showDamage: import("@box-local/mudb/schema").MuBoolean;
                hp: import("@box-local/mudb/schema").MuVarint;
                maxHp: import("@box-local/mudb/schema").MuVarint;
            }>;
            sounds: import("@box-local/mudb/schema").MuStruct<{
                chat: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                hurt: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                die: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                interact: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
            }>;
            playerSounds: import("@box-local/mudb/schema").MuStruct<{
                spawn: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                jump: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                doubleJump: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                land: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                crouch: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                step: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                action0: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                action1: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                swim: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                enterWater: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                leaveWater: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                startFly: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                endFly: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                music: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
            }>;
        }>;
        voxels: import("@box-local/mudb/schema").MuStruct<{
            shape: import("@box-local/mudb/schema").MuStruct<{
                x: import("@box-local/mudb/schema").MuUint16;
                y: import("@box-local/mudb/schema").MuUint16;
                z: import("@box-local/mudb/schema").MuUint16;
            }>;
            chunks: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuASCII>;
        }>;
        seeds: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuStruct<{
            name: import("@box-local/mudb/schema").MuUTF8;
            tags: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuUTF8>;
            editLock: import("@box-local/mudb/schema").MuBoolean;
            staticShadow: import("@box-local/mudb/schema").MuBoolean;
            position: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
            collision: import("@box-local/mudb/schema").MuBoolean;
            gravity: import("@box-local/mudb/schema").MuBoolean;
            fixed: import("@box-local/mudb/schema").MuBoolean;
            mass: import("@box-local/mudb/schema").MuFloat64;
            friction: import("@box-local/mudb/schema").MuFloat64;
            restitution: import("@box-local/mudb/schema").MuFloat64;
            bounds: MuSchema<import("gl-matrix").vec3>;
            meshId: import("@box-local/mudb/schema").MuFloat64;
            mesh: import("@box-local/mudb/schema").MuUTF8;
            scale: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
            orientation: MuSchema<import("gl-matrix").quat>;
            tint: MuSchema<import("gl-matrix").vec4>;
            metalness: import("@box-local/mudb/schema").MuFloat64;
            shininess: import("@box-local/mudb/schema").MuFloat64;
            emissive: import("@box-local/mudb/schema").MuFloat64;
            defaultMotionId: import("@box-local/mudb/schema").MuASCII;
            particle: import("@box-local/mudb/schema").MuStruct<{
                rate: import("@box-local/mudb/schema").MuFloat64;
                rateSpread: import("@box-local/mudb/schema").MuFloat64;
                limit: import("@box-local/mudb/schema").MuVarint;
                lifetime: import("@box-local/mudb/schema").MuFloat64;
                lifetimeSpread: import("@box-local/mudb/schema").MuFloat64;
                color0: import("@box-local/mudb/schema").MuStruct<{
                    r: import("@box-local/mudb/schema").MuFloat64;
                    g: import("@box-local/mudb/schema").MuFloat64;
                    b: import("@box-local/mudb/schema").MuFloat64;
                }>;
                color1: import("@box-local/mudb/schema").MuStruct<{
                    r: import("@box-local/mudb/schema").MuFloat64;
                    g: import("@box-local/mudb/schema").MuFloat64;
                    b: import("@box-local/mudb/schema").MuFloat64;
                }>;
                color2: import("@box-local/mudb/schema").MuStruct<{
                    r: import("@box-local/mudb/schema").MuFloat64;
                    g: import("@box-local/mudb/schema").MuFloat64;
                    b: import("@box-local/mudb/schema").MuFloat64;
                }>;
                color3: import("@box-local/mudb/schema").MuStruct<{
                    r: import("@box-local/mudb/schema").MuFloat64;
                    g: import("@box-local/mudb/schema").MuFloat64;
                    b: import("@box-local/mudb/schema").MuFloat64;
                }>;
                color4: import("@box-local/mudb/schema").MuStruct<{
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
                velocity: import("@box-local/mudb/schema").MuStruct<{
                    x: import("@box-local/mudb/schema").MuFloat64;
                    y: import("@box-local/mudb/schema").MuFloat64;
                    z: import("@box-local/mudb/schema").MuFloat64;
                }>;
                velocitySpread: import("@box-local/mudb/schema").MuStruct<{
                    x: import("@box-local/mudb/schema").MuFloat64;
                    y: import("@box-local/mudb/schema").MuFloat64;
                    z: import("@box-local/mudb/schema").MuFloat64;
                }>;
                acceleration: import("@box-local/mudb/schema").MuStruct<{
                    x: import("@box-local/mudb/schema").MuFloat64;
                    y: import("@box-local/mudb/schema").MuFloat64;
                    z: import("@box-local/mudb/schema").MuFloat64;
                }>;
                damping: import("@box-local/mudb/schema").MuFloat64;
                noiseAmpl: import("@box-local/mudb/schema").MuFloat64;
                noiseFreq: import("@box-local/mudb/schema").MuFloat64;
            }>;
            damage: import("@box-local/mudb/schema").MuStruct<{
                enabled: import("@box-local/mudb/schema").MuBoolean;
                showHealth: import("@box-local/mudb/schema").MuBoolean;
                showDamage: import("@box-local/mudb/schema").MuBoolean;
                hp: import("@box-local/mudb/schema").MuVarint;
                maxHp: import("@box-local/mudb/schema").MuVarint;
            }>;
            sound: import("@box-local/mudb/schema").MuStruct<{
                chat: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                hurt: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                die: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
                interact: import("@box-local/mudb/schema").MuStruct<{
                    sample: import("@box-local/mudb/schema").MuUTF8;
                    radius: import("@box-local/mudb/schema").MuFloat32;
                    pitch: import("@box-local/mudb/schema").MuFloat32;
                    pitchRange: import("@box-local/mudb/schema").MuFloat32;
                    gain: import("@box-local/mudb/schema").MuFloat32;
                    gainRange: import("@box-local/mudb/schema").MuFloat32;
                }>;
            }>;
        }>>;
        assets: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuStruct<{
            type: MuSchema<Cold.AssetType>;
            hash: import("@box-local/mudb/schema").MuASCII;
            size: import("@box-local/mudb/schema").MuVarint;
            previewImage: import("@box-local/mudb/schema").MuASCII;
            ownerId: import("@box-local/mudb/schema").MuVarint;
            contentId: import("@box-local/mudb/schema").MuFloat64;
            bounds: MuSchema<import("gl-matrix").vec3>;
            animated: import("@box-local/mudb/schema").MuBoolean;
        }>>;
        audioAssets: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuStruct<{
            type: MuSchema<Cold.AssetType>;
            hash: import("@box-local/mudb/schema").MuASCII;
            size: import("@box-local/mudb/schema").MuVarint;
            previewImage: import("@box-local/mudb/schema").MuASCII;
            id: import("@box-local/mudb/schema").MuASCII;
            updateAt: import("@box-local/mudb/schema").MuFloat64;
        }>>;
        sound: import("@box-local/mudb/schema").MuStruct<{
            ambient: import("@box-local/mudb/schema").MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
            breakVoxel: import("@box-local/mudb/schema").MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
            placeVoxel: import("@box-local/mudb/schema").MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
            playerJoin: import("@box-local/mudb/schema").MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
            playerLeave: import("@box-local/mudb/schema").MuStruct<{
                sample: import("@box-local/mudb/schema").MuUTF8;
                radius: import("@box-local/mudb/schema").MuFloat32;
                pitch: import("@box-local/mudb/schema").MuFloat32;
                pitchRange: import("@box-local/mudb/schema").MuFloat32;
                gain: import("@box-local/mudb/schema").MuFloat32;
                gainRange: import("@box-local/mudb/schema").MuFloat32;
            }>;
        }>;
        features: import("@box-local/mudb/schema").MuStruct<{
            enableTriggerAPI: import("@box-local/mudb/schema").MuBoolean;
        }>;
        zones: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
            bounds: import("@box-local/mudb/schema").MuStruct<{
                lox: import("@box-local/mudb/schema").MuFloat64;
                loy: import("@box-local/mudb/schema").MuFloat64;
                loz: import("@box-local/mudb/schema").MuFloat64;
                hix: import("@box-local/mudb/schema").MuFloat64;
                hiy: import("@box-local/mudb/schema").MuFloat64;
                hiz: import("@box-local/mudb/schema").MuFloat64;
            }>;
            selector: import("@box-local/mudb/schema").MuUTF8;
            massScale: import("@box-local/mudb/schema").MuFloat64;
            force: import("@box-local/mudb/schema").MuStruct<{
                x: import("@box-local/mudb/schema").MuFloat64;
                y: import("@box-local/mudb/schema").MuFloat64;
                z: import("@box-local/mudb/schema").MuFloat64;
            }>;
            overrideFog: import("@box-local/mudb/schema").MuBoolean;
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
            overrideSky: import("@box-local/mudb/schema").MuBoolean;
            sky: import("@box-local/mudb/schema").MuStruct<{
                skyType: MuSchema<Cold.EnvironmentSkyType>;
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
                gamma: import("@box-local/mudb/schema").MuFloat32;
            }>;
            overrideSnow: import("@box-local/mudb/schema").MuBoolean;
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
            overrideRain: import("@box-local/mudb/schema").MuBoolean;
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
        }>>;
        gamepad: import("@box-local/mudb/schema").MuStruct<{
            joystick: import("@box-local/mudb/schema").MuStruct<{
                background: import("@box-local/mudb/schema").MuUTF8;
                controller: import("@box-local/mudb/schema").MuUTF8;
            }>;
            fly: import("@box-local/mudb/schema").MuStruct<{
                button: import("@box-local/mudb/schema").MuUTF8;
                flyingController: import("@box-local/mudb/schema").MuUTF8;
                flyingBackground: import("@box-local/mudb/schema").MuUTF8;
            }>;
            buttons: import("@box-local/mudb/schema").MuStruct<{
                jump: import("@box-local/mudb/schema").MuUTF8;
                crouch: import("@box-local/mudb/schema").MuUTF8;
                actionA: import("@box-local/mudb/schema").MuUTF8;
                actionB: import("@box-local/mudb/schema").MuUTF8;
            }>;
        }>;
        collisionRules: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
            a: import("@box-local/mudb/schema").MuUTF8;
            b: import("@box-local/mudb/schema").MuUTF8;
        }>>;
        soundAssets: import("@box-local/mudb/schema").MuStruct<{
            hashes: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuASCII>;
            hashId: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuVarint>;
        }>;
        meshAssets: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuStruct<{
            hash: import("@box-local/mudb/schema").MuASCII;
            meshHash: import("@box-local/mudb/schema").MuASCII;
            bounds: MuSchema<import("gl-matrix").vec3>;
            hashType: MuSchema<Hot.HashType>;
            motionList: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuStruct<{
                id: import("@box-local/mudb/schema").MuASCII;
                name: import("@box-local/mudb/schema").MuUTF8;
                duration: import("@box-local/mudb/schema").MuFloat32;
            }>>;
            useCustomBounds: import("@box-local/mudb/schema").MuBoolean;
            customBounds: import("@box-local/mudb/schema").MuStruct<{
                size: MuSchema<import("gl-matrix").vec3>;
                offset: MuSchema<import("gl-matrix").vec3>;
            }>;
            renderBoxOffset: MuSchema<import("gl-matrix").vec3>;
        }>>;
        modules: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuStruct<{
            hash: import("@box-local/mudb/schema").MuASCII;
            isClient: import("@box-local/mudb/schema").MuBoolean;
        }>>;
        scriptIndex: import("@box-local/mudb/schema").MuUTF8;
        uiTree: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuStruct<{
            id: import("@box-local/mudb/schema").MuASCII;
            type: MuSchema<TreeNodeType>;
            name: import("@box-local/mudb/schema").MuUTF8;
            parentId: import("@box-local/mudb/schema").MuASCII;
            childrenIds: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuASCII>;
            value: import("@box-local/mudb/schema").MuOption<import("@box-local/mudb/schema").MuUnion<{
                screen: import("@box-local/mudb/schema").MuStruct<{
                    enable: import("@box-local/mudb/schema").MuBoolean;
                    layout: import("@box-local/mudb/schema").MuUnion<{
                        none: import("@box-local/mudb/schema").MuVoid;
                        autoLayout: import("@box-local/mudb/schema").MuStruct<{
                            cellSize: import("@box-local/mudb/schema").MuStruct<{
                                offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                            columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                            startCorner: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                            fillDirection: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                            maxCells: import("@box-local/mudb/schema").MuVarint;
                            maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                            cellPadding: import("@box-local/mudb/schema").MuStruct<{
                                offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            horizontalAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                            verticalAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                        }>;
                    }>;
                    zIndex: import("@box-local/mudb/schema").MuVarint;
                }>;
                element: import("@box-local/mudb/schema").MuUnion<{
                    box: import("@box-local/mudb/schema").MuStruct<{
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: import("@box-local/mudb/schema").MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: import("@box-local/mudb/schema").MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: import("@box-local/mudb/schema").MuStruct<{
                                cellSize: import("@box-local/mudb/schema").MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: import("@box-local/mudb/schema").MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                    }>;
                    image: import("@box-local/mudb/schema").MuStruct<{
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: import("@box-local/mudb/schema").MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: import("@box-local/mudb/schema").MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: import("@box-local/mudb/schema").MuStruct<{
                                cellSize: import("@box-local/mudb/schema").MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: import("@box-local/mudb/schema").MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        image: import("@box-local/mudb/schema").MuUTF8;
                        imageOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        imageDisplayMode: MuSchema<import("@box-local/schema/project/ui-rda/defs").ImageDisplayMode>;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                    }>;
                    text: import("@box-local/mudb/schema").MuStruct<{
                        richText: import("@box-local/mudb/schema").MuBoolean;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textStrokeColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        textStrokeOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textStrokeThickness: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textFontFamily: MuSchema<import("@box-local/schema/project/ui-rda/defs").UITextFontFamily>;
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: import("@box-local/mudb/schema").MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: import("@box-local/mudb/schema").MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: import("@box-local/mudb/schema").MuStruct<{
                                cellSize: import("@box-local/mudb/schema").MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: import("@box-local/mudb/schema").MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        textContent: import("@box-local/mudb/schema").MuUTF8;
                        textFontSize: import("@box-local/mudb/schema").MuUint8;
                        textColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        textOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textXAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").TextXAlignType>;
                        textYAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").TextYAlignType>;
                        textLineHeight: import("@box-local/mudb/schema").MuQuantizedFloat;
                        autoWordWrap: import("@box-local/mudb/schema").MuBoolean;
                    }>;
                    scrollBox: import("@box-local/mudb/schema").MuStruct<{
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: import("@box-local/mudb/schema").MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: import("@box-local/mudb/schema").MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: import("@box-local/mudb/schema").MuStruct<{
                                cellSize: import("@box-local/mudb/schema").MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: import("@box-local/mudb/schema").MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        scrollDirection: MuSchema<import("@box-local/schema/project/ui-rda/defs").UIScrollDirection>;
                        scrollbarHorizontal: MuSchema<import("@box-local/schema/project/ui-rda/defs").UIScrollbarHorizontal>;
                        scrollbarVertical: MuSchema<import("@box-local/schema/project/ui-rda/defs").UIScrollbarVertical>;
                        scrollbarVisibility: MuSchema<import("@box-local/schema/project/ui-rda/defs").UIScrollbarVisibility>;
                        scrollbarThickness: import("@box-local/mudb/schema").MuVarint;
                        scrollbarColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        scrollbarOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        scrollCanvasAutoResize: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        scrollCanvasSize: import("@box-local/mudb/schema").MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        scrollPosition: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                    }>;
                    input: import("@box-local/mudb/schema").MuStruct<{
                        textStrokeColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        textStrokeOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textStrokeThickness: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textFontFamily: MuSchema<import("@box-local/schema/project/ui-rda/defs").UITextFontFamily>;
                        anchor: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        position: import("@box-local/mudb/schema").MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        size: import("@box-local/mudb/schema").MuStruct<{
                            offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        autoResize: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoResizeType>;
                        visible: import("@box-local/mudb/schema").MuBoolean;
                        backgroundColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        zIndex: import("@box-local/mudb/schema").MuVarint;
                        layoutOrder: import("@box-local/mudb/schema").MuVarint;
                        layout: import("@box-local/mudb/schema").MuUnion<{
                            none: import("@box-local/mudb/schema").MuVoid;
                            autoLayout: import("@box-local/mudb/schema").MuStruct<{
                                cellSize: import("@box-local/mudb/schema").MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                lineHeightEnabled: import("@box-local/mudb/schema").MuBoolean;
                                columnWidthEnabled: import("@box-local/mudb/schema").MuBoolean;
                                startCorner: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutStartCorner>;
                                fillDirection: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutFillDirection>;
                                maxCells: import("@box-local/mudb/schema").MuVarint;
                                maxCellsEnabled: import("@box-local/mudb/schema").MuBoolean;
                                cellPadding: import("@box-local/mudb/schema").MuStruct<{
                                    offset: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                    ratio: import("@box-local/schema/utils/quantized-schema").QuantizedVec2Schema;
                                }>;
                                horizontalAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                                verticalAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                            }>;
                        }>;
                        clipsDescendants: import("@box-local/mudb/schema").MuBoolean;
                        textContent: import("@box-local/mudb/schema").MuUTF8;
                        textFontSize: import("@box-local/mudb/schema").MuUint8;
                        textColor: import("@box-local/schema/utils/quantized-schema").QuantizedVec3Schema;
                        textOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                        textXAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").TextXAlignType>;
                        textYAlignment: MuSchema<import("@box-local/schema/project/ui-rda/defs").TextYAlignType>;
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
        pictureAssets: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuStruct<{
            metadataHash: import("@box-local/mudb/schema").MuASCII;
            hash: import("@box-local/mudb/schema").MuASCII;
            width: import("@box-local/mudb/schema").MuInt32;
            height: import("@box-local/mudb/schema").MuInt32;
        }>>;
        skinAssets: import("@box-local/mudb/schema").MuDictionary<import("@box-local/mudb/schema").MuStruct<{
            hash: import("@box-local/mudb/schema").MuASCII;
            parts: import("@box-local/mudb/schema").MuStruct<{
                hips: import("@box-local/mudb/schema").MuASCII;
                torso: import("@box-local/mudb/schema").MuASCII;
                neck: import("@box-local/mudb/schema").MuASCII;
                head: import("@box-local/mudb/schema").MuASCII;
                leftShoulder: import("@box-local/mudb/schema").MuASCII;
                leftUpperArm: import("@box-local/mudb/schema").MuASCII;
                leftLowerArm: import("@box-local/mudb/schema").MuASCII;
                leftHand: import("@box-local/mudb/schema").MuASCII;
                rightShoulder: import("@box-local/mudb/schema").MuASCII;
                rightUpperArm: import("@box-local/mudb/schema").MuASCII;
                rightLowerArm: import("@box-local/mudb/schema").MuASCII;
                rightHand: import("@box-local/mudb/schema").MuASCII;
                leftUpperLeg: import("@box-local/mudb/schema").MuASCII;
                leftLowerLeg: import("@box-local/mudb/schema").MuASCII;
                leftFoot: import("@box-local/mudb/schema").MuASCII;
                rightUpperLeg: import("@box-local/mudb/schema").MuASCII;
                rightLowerLeg: import("@box-local/mudb/schema").MuASCII;
                rightFoot: import("@box-local/mudb/schema").MuASCII;
            }>;
        }>>;
        defaultSkinName: import("@box-local/mudb/schema").MuUTF8;
    }>>;
}
/**
 * 通过ProjectRDA中的资源更新HotProject的资源
 */
export declare function updateHotProjectAssets(out: Hot.HotProject, projectInfo: Cold.ProjectInfo): void;
//# sourceMappingURL=bake.d.ts.map