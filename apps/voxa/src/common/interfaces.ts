import { modelV7 } from '@box-local/voxa-project';
import { unpackMeshData } from '@box-local/mesher';
import { MeshTextureSchema, MeshDataSchema } from '@box-local/mesher/schema';

export type ModelData = typeof modelV7.ModelDataV7Schema.identity;

export type ModelNodes = ModelData['nodes'];

export type ModelNode = typeof modelV7.ModelNodeSchema.identity;

export type MeshTexture = typeof MeshTextureSchema.identity;

export type ModelMeshes = ModelData['meshes'];

export type ModelMesh = typeof MeshDataSchema.identity;

type UnpackMeshData = typeof unpackMeshData;

export type MeshData = ReturnType<UnpackMeshData>;
