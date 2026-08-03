"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCACert = getCACert;
exports.getCert = getCert;
exports.getKey = getKey;
const fs_1 = require("fs");
const path_1 = require("path");
function getCACert() {
    return (0, fs_1.readFileSync)((0, path_1.resolve)(__dirname, '../certs/minica.pem'));
}
function getCert(domain) {
    return (0, fs_1.readFileSync)((0, path_1.resolve)(__dirname, `../certs/${domain}/cert.pem`));
}
function getKey(domain) {
    return (0, fs_1.readFileSync)((0, path_1.resolve)(__dirname, `../certs/${domain}/key.pem`));
}
//# sourceMappingURL=index.js.map