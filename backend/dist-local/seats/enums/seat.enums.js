"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatLockAuditAction = exports.SeatLockStatus = exports.SeatRuntimeStatus = exports.SeatType = void 0;
var SeatType;
(function (SeatType) {
    SeatType["STANDARD"] = "STANDARD";
    SeatType["VIP"] = "VIP";
    SeatType["PREFERENTIAL"] = "PREFERENTIAL";
    SeatType["DISABLED"] = "DISABLED";
})(SeatType || (exports.SeatType = SeatType = {}));
var SeatRuntimeStatus;
(function (SeatRuntimeStatus) {
    SeatRuntimeStatus["AVAILABLE"] = "AVAILABLE";
    SeatRuntimeStatus["SELECTED"] = "SELECTED";
    SeatRuntimeStatus["LOCKED"] = "LOCKED";
    SeatRuntimeStatus["SOLD"] = "SOLD";
    SeatRuntimeStatus["DISABLED"] = "DISABLED";
})(SeatRuntimeStatus || (exports.SeatRuntimeStatus = SeatRuntimeStatus = {}));
var SeatLockStatus;
(function (SeatLockStatus) {
    SeatLockStatus["LOCKED"] = "LOCKED";
    SeatLockStatus["SOLD"] = "SOLD";
})(SeatLockStatus || (exports.SeatLockStatus = SeatLockStatus = {}));
var SeatLockAuditAction;
(function (SeatLockAuditAction) {
    SeatLockAuditAction["LOCK"] = "LOCK";
    SeatLockAuditAction["RELEASE"] = "RELEASE";
    SeatLockAuditAction["EXPIRE"] = "EXPIRE";
})(SeatLockAuditAction || (exports.SeatLockAuditAction = SeatLockAuditAction = {}));
//# sourceMappingURL=seat.enums.js.map