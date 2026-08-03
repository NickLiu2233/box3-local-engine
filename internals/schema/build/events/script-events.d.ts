import { MuStruct } from '@box-local/mudb/schema';
export declare const ScriptSentEventSchema: MuStruct<{
    damage: MuStruct<{
        hurt: import("@box-local/mudb/schema").MuArray<MuStruct<{
            id: import("@box-local/mudb/schema").MuVarint;
            damage: import("@box-local/mudb/schema").MuVarint;
        }>>;
        respawn: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
        die: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuVarint>;
    }>;
}>;
//# sourceMappingURL=script-events.d.ts.map