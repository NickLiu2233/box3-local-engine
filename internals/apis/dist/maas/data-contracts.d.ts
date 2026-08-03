import { ModelType } from '../data-contracts';
export interface Resp<T> {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: T;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export declare enum ContentType {
    Map = 1,
    Model = 2
}
export type ModelInfo = {
    createdAt: string;
    updatedAt: string;
    fileHash: string;
    modelDescription: string;
    /**
     * 模型文件hash
     */
    modelFileHash: string;
    /**
     * @deprecated
     * 旧的返回字段
     * 目前等于modelFileHash
     * 模型文件hash
     */
    modelFileUUID: string;
    modelId: number;
    modelName: string;
    /**
     * 模型预览图 hash
     */
    modelPreviewHash: string;
    /**
     * @deprecated
     * 旧的返回字段
     * 目前等于modelPreviewHash
     * 模型预览图 hash
     */
    modelPreviewUUID: string;
    modelType: ModelType;
    /**
     * 模型的工程文件hash
     */
    projectFileHash: string;
    /**
     * @deprecated
     * 旧的返回字段
     * 目前等于projectFileHash
     * 模型的工程文件 hash
     */
    projectFileUUID: string;
};
export type ContentInfo = {
    contentType: ContentType.Map;
    mapInfo: {
        editHash: string;
        playHash: string;
    };
} | {
    contentType: ContentType.Model;
    modelInfo: ModelInfo;
};
export type ContentInfoResp = Resp<ContentInfo>;
export type PartnerConfig = {
    loginUrl: string;
    mapEditorAddr: string;
    modelEditorAddr: string;
};
export type PartnerConfigResp = Resp<PartnerConfig>;
export type PartnerPublicConfig = {
    extraConfig: {
        skipPublish?: boolean;
        blockChat?: boolean;
    };
    loginUrl: string;
};
export type PartnerConfigResType = {
    extraConfig: string;
    loginUrl: string;
};
export type PartnerPublicConfigResp = Resp<PartnerConfigResType>;
export declare enum Permissions {
    UserEnginePlay = "user:engine:play",
    UserEngineManage = "user:engine:manage",
    UserEngineEditor = "user:engine:editor",
    UserEngineEditorGenerate = "user:engine:editor:generate",
    UserVoxelManage = "user:voxel:manage",
    UserVoxelEditor = "user:voxel:editor",
    UserVoxelEditorMultiObj = "user:voxel:editor:multi_object",
    UserVoxelEditorMultiObjAnimation = "user:voxel:editor:multi_object:animation",
    ResourceEnginePlay = "resource:engine:play"
}
export type PermissionsResp = Resp<Permissions[]>;
export declare enum ResourceConfigs {
    MapVisitor = "map:visitor"
}
export type ResourceConfigsResp = Resp<ResourceConfigs[]>;
//# sourceMappingURL=data-contracts.d.ts.map