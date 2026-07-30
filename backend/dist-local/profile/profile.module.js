"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const notification_preference_entity_1 = require("../auth/entities/notification-preference.entity");
const user_profile_entity_1 = require("../auth/entities/user-profile.entity");
const user_entity_1 = require("../auth/entities/user.entity");
const cinema_entity_1 = require("../locations/entities/cinema.entity");
const city_entity_1 = require("../locations/entities/city.entity");
const profile_controller_1 = require("./profile.controller");
const profile_service_1 = require("./profile.service");
let ProfileModule = class ProfileModule {
};
exports.ProfileModule = ProfileModule;
exports.ProfileModule = ProfileModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                user_profile_entity_1.UserProfile,
                notification_preference_entity_1.NotificationPreference,
                city_entity_1.City,
                cinema_entity_1.Cinema,
            ]),
            auth_module_1.AuthModule,
        ],
        controllers: [profile_controller_1.ProfileController],
        providers: [profile_service_1.ProfileService],
        exports: [profile_service_1.ProfileService],
    })
], ProfileModule);
//# sourceMappingURL=profile.module.js.map