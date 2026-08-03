"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addHttpAnalytics = addHttpAnalytics;
exports.wrapAsyncHttpHandler = wrapAsyncHttpHandler;
const ip_1 = require("@box-local/utils/ip");
function addHttpAnalytics(server_name, analytics, req) {
    analytics.addHttp({
        server_name,
        host: req.headers.host || '',
        ip: (0, ip_1.getRealIP)(req) || '127.0.0.1',
        method: req.method || '',
        path: req.url || '',
        referer: req.headers.referer || '',
        user_agent: req.headers['user-agent'] || '',
    });
}
function wrapAsyncHttpHandler(server_name, analytics, handler) {
    return async (req, res) => {
        addHttpAnalytics(server_name, analytics, req);
        handler(req, res);
    };
}
