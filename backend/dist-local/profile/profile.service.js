"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ProfileService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const notification_preference_entity_1 = require("../auth/entities/notification-preference.entity");
const user_profile_entity_1 = require("../auth/entities/user-profile.entity");
const user_entity_1 = require("../auth/entities/user.entity");
const cinema_entity_1 = require("../locations/entities/cinema.entity");
const city_entity_1 = require("../locations/entities/city.entity");
const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;
let ProfileService = ProfileService_1 = class ProfileService {
    userRepo;
    profileRepo;
    prefsRepo;
    cityRepo;
    cinemaRepo;
    configService;
    logger = new common_1.Logger(ProfileService_1.name);
    constructor(userRepo, profileRepo, prefsRepo, cityRepo, cinemaRepo, configService) {
        this.userRepo = userRepo;
        this.profileRepo = profileRepo;
        this.prefsRepo = prefsRepo;
        this.cityRepo = cityRepo;
        this.cinemaRepo = cinemaRepo;
        this.configService = configService;
    }
    async getProfile(userId) {
        const { user, profile, prefs } = await this.loadOwned(userId);
        return this.toResult(user, profile, prefs);
    }
    async updateProfile(userId, dto) {
        const { user, profile, prefs } = await this.loadOwned(userId);
        if (dto.cityId !== undefined || dto.favoriteCinemaId !== undefined) {
            await this.validateLocation(dto.cityId ?? profile.cityId, dto.favoriteCinemaId !== undefined
                ? dto.favoriteCinemaId
                : profile.favoriteCinemaId);
        }
        let emailReverificationRequired = false;
        if (dto.email !== undefined) {
            const newEmail = dto.email.trim().toLowerCase();
            if (newEmail !== user.email) {
                const clash = await this.userRepo.findOne({
                    where: { email: newEmail },
                });
                if (clash) {
                    throw new common_1.ConflictException('El correo electrónico ya está registrado (RN-021)');
                }
                const activationToken = (0, crypto_1.randomBytes)(32).toString('hex');
                user.email = newEmail;
                user.isEmailVerified = false;
                user.isActive = false;
                user.activationToken = activationToken;
                user.activationTokenExpiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
                emailReverificationRequired = true;
                this.dispatchEmailReverification(newEmail, activationToken);
            }
        }
        if (dto.phone !== undefined) {
            user.phone = dto.phone.trim();
        }
        if (dto.firstName !== undefined) {
            profile.firstName = dto.firstName.trim();
        }
        if (dto.lastName !== undefined) {
            profile.lastName = dto.lastName.trim();
        }
        if (dto.birthDate !== undefined) {
            profile.birthDate = dto.birthDate;
        }
        if (dto.gender !== undefined) {
            profile.gender = dto.gender;
        }
        if (dto.cityId !== undefined) {
            profile.cityId = dto.cityId;
        }
        if (dto.favoriteCinemaId !== undefined) {
            profile.favoriteCinemaId = dto.favoriteCinemaId;
        }
        if (dto.photoUrl !== undefined) {
            profile.photoUrl = dto.photoUrl;
        }
        if (dto.notificationPreferences) {
            const np = dto.notificationPreferences;
            if (np.emailTransactional !== undefined) {
                prefs.emailTransactional = np.emailTransactional;
            }
            if (np.emailMarketing !== undefined) {
                prefs.emailMarketing = np.emailMarketing;
            }
            if (np.emailUpcoming !== undefined) {
                prefs.emailUpcoming = np.emailUpcoming;
            }
        }
        await this.userRepo.save(user);
        await this.profileRepo.save(profile);
        await this.prefsRepo.save(prefs);
        const result = this.toResult(user, profile, prefs);
        return {
            ...result,
            emailReverificationRequired,
            message: emailReverificationRequired
                ? 'Perfil actualizado. Revisa el nuevo correo para reactivar la cuenta (RN-034).'
                : 'Perfil actualizado correctamente',
        };
    }
    async loadOwned(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException(`Usuario no encontrado: ${userId}`);
        }
        const profile = await this.profileRepo.findOne({ where: { userId } });
        if (!profile) {
            throw new common_1.NotFoundException(`Perfil no encontrado para: ${userId}`);
        }
        const prefs = await this.prefsRepo.findOne({ where: { userId } });
        if (!prefs) {
            throw new common_1.NotFoundException(`Preferencias de notificación no encontradas para: ${userId}`);
        }
        return { user, profile, prefs };
    }
    async validateLocation(cityId, favoriteCinemaId) {
        const city = await this.cityRepo.findOne({
            where: { id: cityId, isActive: true },
        });
        if (!city) {
            throw new common_1.BadRequestException('La ciudad no existe o no está activa');
        }
        if (favoriteCinemaId) {
            const cinema = await this.cinemaRepo.findOne({
                where: {
                    id: favoriteCinemaId,
                    cityId,
                    isActive: true,
                },
            });
            if (!cinema) {
                throw new common_1.BadRequestException('El complejo favorito no pertenece a la ciudad o no está activo');
            }
        }
    }
    dispatchEmailReverification(email, token) {
        const baseUrl = this.configService.get('APP_PUBLIC_URL', 'http://localhost:3000');
        const link = `${baseUrl}/api/v1/auth/activate?token=${token}`;
        this.logger.log(`Correo re-verificación email (HU-008 → HU-015) → email=${email} link=${link}`);
    }
    toResult(user, profile, prefs) {
        return {
            userId: user.id,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            isActive: user.isActive,
            phone: user.phone,
            documentType: user.documentType,
            documentNumber: user.documentNumber,
            firstName: profile.firstName,
            lastName: profile.lastName,
            birthDate: profile.birthDate,
            gender: profile.gender,
            cityId: profile.cityId,
            favoriteCinemaId: profile.favoriteCinemaId,
            photoUrl: profile.photoUrl,
            notificationPreferences: {
                emailTransactional: prefs.emailTransactional,
                emailMarketing: prefs.emailMarketing,
                emailUpcoming: prefs.emailUpcoming,
            },
        };
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = ProfileService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(user_profile_entity_1.UserProfile)),
    __param(2, (0, typeorm_1.InjectRepository)(notification_preference_entity_1.NotificationPreference)),
    __param(3, (0, typeorm_1.InjectRepository)(city_entity_1.City)),
    __param(4, (0, typeorm_1.InjectRepository)(cinema_entity_1.Cinema)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService])
], ProfileService);
//# sourceMappingURL=profile.service.js.map