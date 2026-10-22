import { type ModelDataV7 } from './model/schema-v7';
export type VoxaPlayMetadata = {
    projectId?: string;
    author: string;
    description: string;
    version: string;
    defaultAnimationId: string | null;
};
export type VoxaPlayPlacement = {
    origin: [number, number, number];
    pivot: [number, number, number];
};
export type VoxaPlayBundle = VoxaPlayMetadata & {
    format: 'box-voxa-play';
    formatVersion: 2;
    name: string;
    previewImage?: string;
    placement: VoxaPlayPlacement;
    model: ModelDataV7;
};
export declare function decodeVoxaPlay(bytes: Uint8Array): VoxaPlayBundle;
export declare function encodeVoxaPlay(name: string, model: ModelDataV7, previewImage?: string, metadata?: Partial<VoxaPlayMetadata> & Partial<Pick<VoxaPlayBundle, 'placement'>>): Uint8Array;
export declare function voxaPlayFileName(name: string): string;
