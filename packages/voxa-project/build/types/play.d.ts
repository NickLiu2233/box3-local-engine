import { type ModelDataV7 } from './model/schema-v7';
export declare const VOXA_PLAY_MAX_BYTES: number;
export type VoxaPlayMetadata = {
    author: string;
    description: string;
    version: string;
    defaultAnimationId: string | null;
};
export type VoxaPlayBundle = VoxaPlayMetadata & {
    format: 'box-voxa-play';
    formatVersion: 1;
    name: string;
    previewImage?: string;
    model: ModelDataV7;
};
export declare function decodeVoxaPlay(bytes: Uint8Array): VoxaPlayBundle;
export declare function encodeVoxaPlay(name: string, model: ModelDataV7, previewImage?: string, metadata?: Partial<VoxaPlayMetadata>): Uint8Array;
export declare function voxaPlayFileName(name: string): string;
