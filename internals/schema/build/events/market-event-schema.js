"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseSuccessEventsSchema = exports.PurchaseSuccessSchema = void 0;
const schema_1 = require("@box-local/mudb/schema");
exports.PurchaseSuccessSchema = new schema_1.MuStruct({
    messageId: new schema_1.MuUTF8(),
    userId: new schema_1.MuUTF8(),
    productId: new schema_1.MuUTF8(),
    orderId: new schema_1.MuUTF8(),
});
exports.PurchaseSuccessEventsSchema = new schema_1.MuArray(exports.PurchaseSuccessSchema, Infinity);
//# sourceMappingURL=market-event-schema.js.map