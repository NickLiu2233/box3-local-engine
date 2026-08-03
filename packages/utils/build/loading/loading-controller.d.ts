import { EventBus } from '../event';
import { TaskTypeEnum } from './loading-schema';
export declare class LoadingController {
    events: EventBus<import("@box-local/mudb/schema/struct").Struct<{
        taskName: import("@box-local/mudb/schema").MuUTF8;
        taskType: import("@box-local/mudb/schema").MuSchema<TaskTypeEnum>;
    }>>;
    pending: number;
    completed: number;
    appLoaded: boolean;
    startTask(mesg: string, type: TaskTypeEnum, count?: number): void;
    endTask(mesg: string, type: TaskTypeEnum): void;
    task(mesg: string, type: TaskTypeEnum): void;
    progress(): number;
}
//# sourceMappingURL=loading-controller.d.ts.map