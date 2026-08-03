import { MuStruct, MuArray, MuUTF8 } from '@box-local/mudb/schema';
export declare const PurchaseSuccessSchema: MuStruct<{
    messageId: MuUTF8;
    userId: MuUTF8;
    productId: MuUTF8;
    orderId: MuUTF8;
}>;
export declare const PurchaseSuccessEventsSchema: MuArray<MuStruct<{
    messageId: MuUTF8;
    userId: MuUTF8;
    productId: MuUTF8;
    orderId: MuUTF8;
}>>;
//# sourceMappingURL=market-event-schema.d.ts.map