import { MuStruct, MuArray, MuUTF8 } from '@box-local/mudb/schema';

export const PurchaseSuccessSchema = new MuStruct({
  messageId: new MuUTF8(),
  userId: new MuUTF8(),
  productId: new MuUTF8(),
  orderId: new MuUTF8(),
});

export const PurchaseSuccessEventsSchema = new MuArray(
  PurchaseSuccessSchema,
  Infinity,
);
