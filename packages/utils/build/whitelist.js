"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Whitelist = void 0;
const minimatch_1 = __importDefault(require("minimatch"));
const regex = /^https?:\/\//i;
function urlNoProtocol(url) {
    return url.replace(regex, '');
}
class Whitelist {
    constructor(list) {
        this.rules = [];
        if (list) {
            for (const rule of list) {
                this.add(rule);
            }
        }
    }
    add(rule) {
        this.rules.push(rule);
    }
    test(url) {
        for (const rule of this.rules) {
            if ((0, minimatch_1.default)(urlNoProtocol(url), rule)) {
                return true;
            }
        }
        return false;
    }
}
exports.Whitelist = Whitelist;
