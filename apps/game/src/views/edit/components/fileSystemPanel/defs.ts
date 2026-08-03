import { AssetType } from '@box-local/schema/project/project-rda';

export const AUDIO_EXTS = ['.mp3', '.m4a', '.wav', '.ogg', '.opus'];
export const IMAGE_EXTS_WITHOUT_DOT = ['jpg', 'jpeg', 'png'];
export const IMAGE_MIMES = IMAGE_EXTS_WITHOUT_DOT.map((_) => `image/${_}`);

const OSS_ASSET_TYPES = [AssetType.VOXEL_MODEL, AssetType.PICTURE];

export function isOSSAsset(type: AssetType) {
  return OSS_ASSET_TYPES.includes(type);
}

export const TOTAL_SPACE = 100 * 1024 * 1024;
