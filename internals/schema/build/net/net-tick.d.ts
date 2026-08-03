import { MuStruct, MuUint32, MuFloat64, MuBoolean } from '@box-local/mudb/schema';
import { NetInput, NetState, NetClientInput } from './net-schema';
import { RigidBody, ContactIndex } from '../physics/physics-schema';
import { VoxelCollision } from '../voxel/voxel-collision-schema';
import { BlockIndex } from '../voxel/block-schema';
import { PhysicsZoneIndex } from '../physics/zone-index';
export declare function netTick(netState: NetState, netInput: NetInput, blockIndex: BlockIndex, collision: VoxelCollision, contact: ContactIndex, zoneIndex: PhysicsZoneIndex, updateLocks: boolean, fullContact: boolean): import("@box-local/mudb/schema/struct").Struct<{
    players: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        id: import("@box-local/mudb/schema").MuVarint;
        physGround: MuBoolean;
        physFluid: import("@box-local/mudb/schema").MuQuantizedFloat;
        platformX: import("@box-local/mudb/schema").MuQuantizedFloat;
        platformY: import("@box-local/mudb/schema").MuQuantizedFloat;
        platformZ: import("@box-local/mudb/schema").MuQuantizedFloat;
        occupancy: import("@box-local/mudb/schema").MuUint8;
        flags: import("@box-local/mudb/schema").MuSchema<import("../player/player-schema").PlayerFlags>;
        walkSpeed: import("@box-local/mudb/schema").MuQuantizedFloat;
        walkAcceleration: import("@box-local/mudb/schema").MuQuantizedFloat;
        runSpeed: import("@box-local/mudb/schema").MuQuantizedFloat;
        runAcceleration: import("@box-local/mudb/schema").MuQuantizedFloat;
        crouchSpeed: import("@box-local/mudb/schema").MuQuantizedFloat;
        crouchAcceleration: import("@box-local/mudb/schema").MuQuantizedFloat;
        swimSpeed: import("@box-local/mudb/schema").MuQuantizedFloat;
        swimAcceleration: import("@box-local/mudb/schema").MuQuantizedFloat;
        flySpeed: import("@box-local/mudb/schema").MuQuantizedFloat;
        flyAcceleration: import("@box-local/mudb/schema").MuQuantizedFloat;
        jumpSpeedFactor: import("@box-local/mudb/schema").MuQuantizedFloat;
        jumpAccelerationFactor: import("@box-local/mudb/schema").MuQuantizedFloat;
        jumpPower: import("@box-local/mudb/schema").MuQuantizedFloat;
        doubleJumpPower: import("@box-local/mudb/schema").MuQuantizedFloat;
        freezedForwardAngle: import("@box-local/mudb/schema").MuUint16;
        inputDirectionState: import("@box-local/mudb/schema").MuUint8;
        stepHeight: import("@box-local/mudb/schema").MuQuantizedFloat;
    }>>;
    playerInputs: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        id: MuUint32;
        state: import("@box-local/mudb/schema").MuUint16;
        angle: import("@box-local/mudb/schema").MuUint8;
        cameraAngle: import("@box-local/mudb/schema").MuUint8;
        pitch: import("@box-local/mudb/schema").MuUint8;
    }>>;
    physics: MuStruct<{
        gravity: MuFloat64;
        velocityDamping: MuFloat64;
        useOBB: MuBoolean;
    }>;
    bodies: import("@box-local/mudb/schema").MuSortedArray<import("@box-local/mudb/schema").MuSchema<RigidBody> & {
        pool: RigidBody[];
        stats: () => any;
    }>;
    collisionFilter: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuSortedArray<import("@box-local/mudb/schema").MuVarint>>;
    zones: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        id: import("@box-local/mudb/schema").MuVarint;
        minX: import("@box-local/mudb/schema").MuQuantizedFloat;
        minY: import("@box-local/mudb/schema").MuQuantizedFloat;
        minZ: import("@box-local/mudb/schema").MuQuantizedFloat;
        maxX: import("@box-local/mudb/schema").MuQuantizedFloat;
        maxY: import("@box-local/mudb/schema").MuQuantizedFloat;
        maxZ: import("@box-local/mudb/schema").MuQuantizedFloat;
        selectorGroup: import("@box-local/mudb/schema").MuVarint;
        massScale: import("@box-local/mudb/schema").MuQuantizedFloat;
        fx: import("@box-local/mudb/schema").MuQuantizedFloat;
        fy: import("@box-local/mudb/schema").MuQuantizedFloat;
        fz: import("@box-local/mudb/schema").MuQuantizedFloat;
    }>>;
    zoneSelectors: import("@box-local/mudb/schema").MuSortedArray<MuStruct<{
        id: import("@box-local/mudb/schema").MuVarint;
        groupBits: import("@box-local/mudb/schema").MuSortedArray<import("@box-local/mudb/schema").MuVarint>;
    }>>;
}>;
export declare function mergeNetInput(input: NetInput, id: number, clientInput: NetClientInput, allowBodyUpdates: boolean): void;
//# sourceMappingURL=net-tick.d.ts.map