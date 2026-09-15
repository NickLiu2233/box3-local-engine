/**
 * Stable protocol surface shared by CLI clients and Creator HTTP adapters.
 * This module deliberately contains no HTTP, credential or storage code:
 * those are adapters owned by the calling application.
 */
export declare const CREATOR_API_VERSION: "v1";
export declare const CREATOR_API_PREFIX: "/api/creator/v1";
export declare const CREATOR_CAPABILITIES: readonly ["projects.view", "projects.create", "projects.edit", "projects.delete", "projects.import", "projects.export", "models.manage"];
export type CreatorCapability = typeof CREATOR_CAPABILITIES[number];
export declare const CREATOR_CAPABILITY_META: Readonly<Record<CreatorCapability, Readonly<{
    label: string;
    description: string;
}>>>;
export declare const FULL_CREATOR_CAPABILITIES: CreatorCapability[];
export declare const CREATOR_SCRIPT_SIDES: readonly ["client", "server"];
export type CreatorScriptSide = typeof CREATOR_SCRIPT_SIDES[number];
export declare const CREATOR_SCRIPT_MAX_BYTES: number;
export type CreatorProjectScriptWrite = Readonly<{
    projectId: string;
    side: CreatorScriptSide;
    entry: string;
    content: string;
}>;
export type CreatorProjectScriptWriteResult = Readonly<{
    entry: string;
    side: CreatorScriptSide;
    revision: string;
    hash: string;
    shared: boolean;
}>;
export interface CreatorProjectScriptStore {
    updateProjectScript(projectId: string, side: CreatorScriptSide, entry: string, content: string): CreatorProjectScriptWriteResult;
}
export declare function normalizeCreatorCapabilities(value: unknown): CreatorCapability[];
export declare function hasCreatorCapability(permissions: readonly string[], capability: CreatorCapability): boolean;
export declare function creatorApiPath(...segments: readonly (string | number)[]): string;
export declare function creatorProjectScriptPath(projectId: string, side: CreatorScriptSide, entry: string): string;
export declare function parseCreatorProjectScriptWrite(value: unknown): CreatorProjectScriptWrite;
export declare function writeCreatorProjectScript(store: CreatorProjectScriptStore, input: CreatorProjectScriptWrite): CreatorProjectScriptWriteResult;
