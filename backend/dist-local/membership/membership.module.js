"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const user_entity_1 = require("../auth/entities/user.entity");
const membership_entity_1 = require("./entities/membership.entity");
const wallet_entity_1 = require("./entities/wallet.entity");
const membership_controller_1 = require("./membership.controller");
const membership_service_1 = require("./membership.service");
let MembershipModule = class MembershipModule {
};
exports.MembershipModule = MembershipModule;
exports.MembershipModule = MembershipModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([membership_entity_1.Membership, wallet_entity_1.Wallet, user_entity_1.User]),
            (0, common_1.forwardRef)(() => auth_module_1.AuthModule),
        ],
        controllers: [membership_controller_1.MembershipController],
        providers: [membership_service_1.MembershipService],
        exports: [membership_service_1.MembershipService],
    })
], MembershipModule);
//# sourceMappingURL=membership.module.js.map