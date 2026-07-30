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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const typeorm_1 = require("typeorm");
const cinema_entity_1 = require("../../locations/entities/cinema.entity");
const movie_enums_1 = require("../enums/movie.enums");
const showtime_entity_1 = require("./showtime.entity");
let Room = class Room {
    id;
    name;
    roomType;
    capacity;
    cinemaId;
    cinema;
    showtimes;
};
exports.Room = Room;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Room.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 80 }),
    __metadata("design:type", String)
], Room.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], Room.prototype, "roomType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Room.prototype, "capacity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Room.prototype, "cinemaId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cinema_entity_1.Cinema, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'cinemaId' }),
    __metadata("design:type", cinema_entity_1.Cinema)
], Room.prototype, "cinema", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => showtime_entity_1.Showtime, (showtime) => showtime.room),
    __metadata("design:type", Array)
], Room.prototype, "showtimes", void 0);
exports.Room = Room = __decorate([
    (0, typeorm_1.Entity)('rooms')
], Room);
//# sourceMappingURL=room.entity.js.map