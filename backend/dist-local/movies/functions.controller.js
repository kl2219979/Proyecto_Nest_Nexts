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
exports.FunctionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const showtimes_service_1 = require("./showtimes.service");
let FunctionsController = class FunctionsController {
    showtimesService;
    constructor(showtimesService) {
        this.showtimesService = showtimesService;
    }
    getPrices(id) {
        return this.showtimesService.getFunctionPrices(id);
    }
};
exports.FunctionsController = FunctionsController;
__decorate([
    (0, common_1.Get)(':id/prices'),
    (0, swagger_1.ApiOperation)({
        summary: 'Precio actualizado de una función',
        description: 'RN-037 precio según formato/sala/horario · RN-038 promociones (vacío hasta HU-026) · RN-035/036 solo futuras activas.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Desglose de precio de la función' }),
    (0, swagger_1.ApiNotFoundResponse)({
        description: 'Función inexistente, inactiva o ya iniciada',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FunctionsController.prototype, "getPrices", null);
exports.FunctionsController = FunctionsController = __decorate([
    (0, swagger_1.ApiTags)('Functions'),
    (0, common_1.Controller)('functions'),
    __metadata("design:paramtypes", [showtimes_service_1.ShowtimesService])
], FunctionsController);
//# sourceMappingURL=functions.controller.js.map