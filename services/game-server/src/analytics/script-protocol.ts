import { MuASCII, MuStruct, MuUTF8, MuVarint } from '@box-local/mudb/schema';

export const AnalyticsScriptProtocol = {
  name: 'analytics',
  client: {},
  server: {
    initSensor: new MuStruct({
      url: new MuASCII(),
      timeout: new MuVarint(),
    }),
    trackSensor: new MuStruct({
      distinctId: new MuASCII(),
      eventName: new MuASCII(),
      properties: new MuUTF8(),
    }),
  },
};
