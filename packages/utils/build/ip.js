"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRealIP = getRealIP;
function getRealIP(req) {
    const forwardedIP = req.headers['x-forwarded-for'];
    if (typeof forwardedIP === 'string' && forwardedIP.length > 0) {
        return forwardedIP;
    }
    return req.connection.remoteAddress;
}
