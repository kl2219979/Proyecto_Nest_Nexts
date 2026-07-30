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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../auth/entities/user.entity");
const membership_entity_1 = require("./entities/membership.entity");
const wallet_entity_1 = require("./entities/wallet.entity");
const membership_enums_1 = require("./enums/membership.enums");
const membership_benefits_1 = require("./membership-benefits");
let MembershipService = class MembershipService {
    membershipRepo;
    walletRepo;
    userRepo;
    dataSource;
    constructor(membershipRepo, walletRepo, userRepo, dataSource) {
        this.membershipRepo = membershipRepo;
        this.walletRepo = walletRepo;
        this.userRepo = userRepo;
        this.dataSource = dataSource;
    }
    async create(dto) {
        return this.createForUser(dto.userId);
    }
    async createForUser(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException(`Usuario no encontrado: ${userId}`);
        }
        const existing = await this.membershipRepo.findOne({
            where: { userId },
        });
        if (existing) {
            throw new common_1.ConflictException('El usuario ya tiene una membresía digital (RN-025)');
        }
        return this.dataSource.transaction((manager) => this.persistMembershipAndWallet(userId, manager));
    }
    async findByUserId(userId) {
        return this.membershipRepo.findOne({ where: { userId } });
    }
    async getDetailForUser(userId) {
        const membership = await this.membershipRepo.findOne({
            where: { userId },
        });
        if (!membership) {
            throw new common_1.NotFoundException(`Membresía no encontrada para el usuario: ${userId}`);
        }
        const wallet = await this.walletRepo.findOne({ where: { userId } });
        return {
            id: membership.id,
            userId: membership.userId,
            code: membership.code,
            status: membership.status,
            level: membership.level,
            benefits: (0, membership_benefits_1.benefitsForLevel)(membership.level),
            qr: {
                payload: membership.code,
                transferable: false,
            },
            wallet: {
                balance: wallet?.balance ?? '0.00',
            },
            purchaseHistory: [],
            pointsHistory: [],
            activeReservations: [],
            createdAt: membership.createdAt.toISOString(),
        };
    }
    async persistMembershipAndWallet(userId, manager) {
        const code = await this.generateUniqueCode(manager);
        const savedMembership = await manager.save(membership_entity_1.Membership, manager.create(membership_entity_1.Membership, {
            userId,
            code,
            status: membership_enums_1.MembershipStatus.ACTIVE,
            level: membership_enums_1.MembershipLevel.BRONZE,
        }));
        await manager.save(wallet_entity_1.Wallet, manager.create(wallet_entity_1.Wallet, {
            userId,
            balance: '0.00',
        }));
        return this.toResult(savedMembership);
    }
    async generateUniqueCode(manager) {
        const repo = manager
            ? manager.getRepository(membership_entity_1.Membership)
            : this.membershipRepo;
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const code = `MC-${(0, crypto_1.randomBytes)(4).toString('hex').toUpperCase()}`;
            const clash = await repo.findOne({ where: { code } });
            if (!clash) {
                return code;
            }
        }
        throw new common_1.ConflictException('No se pudo generar un código de membresía único');
    }
    toResult(membership) {
        return {
            id: membership.id,
            userId: membership.userId,
            code: membership.code,
            status: membership.status,
            level: membership.level,
            createdAt: membership.createdAt.toISOString(),
        };
    }
};
exports.MembershipService = MembershipService;
exports.MembershipService = MembershipService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(membership_entity_1.Membership)),
    __param(1, (0, typeorm_1.InjectRepository)(wallet_entity_1.Wallet)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], MembershipService);
//# sourceMappingURL=membership.service.js.map