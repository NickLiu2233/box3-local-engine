import { ContactIndex, ContactRecord } from './physics-schema';
export declare function findContact(index: ContactIndex, id: number): import("@box-local/mudb/schema/struct").Struct<{
    id: import("@box-local/mudb/schema").MuVarint;
    body: import("@box-local/mudb/schema").MuSortedArray<import("@box-local/mudb/schema").MuStruct<{
        otherId: import("@box-local/mudb/schema").MuVarint;
        nx: import("@box-local/mudb/schema").MuFloat32;
        ny: import("@box-local/mudb/schema").MuFloat32;
        nz: import("@box-local/mudb/schema").MuFloat32;
        fx: import("@box-local/mudb/schema").MuFloat32;
        fy: import("@box-local/mudb/schema").MuFloat32;
        fz: import("@box-local/mudb/schema").MuFloat32;
    }>>;
    voxel: import("@box-local/mudb/schema").MuSortedArray<import("@box-local/mudb/schema").MuStruct<{
        x: import("@box-local/mudb/schema").MuVarint;
        y: import("@box-local/mudb/schema").MuVarint;
        z: import("@box-local/mudb/schema").MuVarint;
        b: import("@box-local/mudb/schema").MuVarint;
        axis: import("@box-local/mudb/schema").MuInt8;
        fx: import("@box-local/mudb/schema").MuFloat32;
        fy: import("@box-local/mudb/schema").MuFloat32;
        fz: import("@box-local/mudb/schema").MuFloat32;
    }>>;
    fluidVoxels: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
    fluidVolumeFraction: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuFloat32>;
}> | null;
export declare function addBodyContactRecordByAABBContact(record: ContactRecord, otherId: number, s: number, d: number, lambda: number, frictionU: number, frictionV: number): void;
export declare function addBodyContactRecord(record: ContactRecord, otherId: number, nx: number, ny: number, nz: number, fx: number, fy: number, fz: number): void;
export declare function addFluidContactRecord(record: ContactRecord, block: number, volume: number): void;
export declare function compactContactIndex(contact: ContactIndex): void;
//# sourceMappingURL=contact-controller.d.ts.map