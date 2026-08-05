import type { SensorsEvents } from './defs';

class LocalSensorsTracker {
  public login() {}
  public track(_event: SensorsEvents) {}
}

export const sensorsTracker = new LocalSensorsTracker();
