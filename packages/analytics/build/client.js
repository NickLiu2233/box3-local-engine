"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsClient = void 0;
const client_1 = require("@box-local/mudb/rpc/client");
const protocol_1 = require("./protocol");
class AnalyticsClient {
    constructor(logger, transport) {
        this.logger = logger;
        this.rpc = new client_1.MuRPCClient(protocol_1.AnalyticsRPCSchema, transport);
    }
    addEvent(event) {
        this.rpc.api
            .addEvent(event)
            .catch((err) => {
            this.logger.warn('upload analytics event failed:');
            this.logger.warn(err);
        })
            .catch(this.logger.error);
    }
    addTop(top) {
        this.rpc.api
            .addTop(top)
            .catch((err) => {
            this.logger.warn('upload analytics top failed:');
            this.logger.warn(err);
        })
            .catch(this.logger.error);
    }
    addEngine(engine) {
        this.rpc.api
            .addEngine(engine)
            .catch((err) => {
            this.logger.warn('upload analytics engine failed:');
            this.logger.warn(err);
        })
            .catch(this.logger.error);
    }
    addHttp(http) {
        this.rpc.api
            .addHttp(http)
            .catch((err) => {
            this.logger.warn('upload analytics http failed:');
            this.logger.warn(err);
        })
            .catch(this.logger.error);
    }
}
exports.AnalyticsClient = AnalyticsClient;
