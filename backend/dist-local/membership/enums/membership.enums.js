"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipLevel = exports.MembershipStatus = void 0;
var MembershipStatus;
(function (MembershipStatus) {
    MembershipStatus["ACTIVE"] = "ACTIVE";
    MembershipStatus["SUSPENDED"] = "SUSPENDED";
    MembershipStatus["CANCELLED"] = "CANCELLED";
})(MembershipStatus || (exports.MembershipStatus = MembershipStatus = {}));
var MembershipLevel;
(function (MembershipLevel) {
    MembershipLevel["BRONZE"] = "BRONZE";
    MembershipLevel["SILVER"] = "SILVER";
    MembershipLevel["GOLD"] = "GOLD";
    MembershipLevel["PLATINUM"] = "PLATINUM";
})(MembershipLevel || (exports.MembershipLevel = MembershipLevel = {}));
//# sourceMappingURL=membership.enums.js.map