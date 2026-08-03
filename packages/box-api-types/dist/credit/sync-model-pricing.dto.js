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
exports.SyncModelPricingResponseDto = exports.SyncModelPricingRequestDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class SyncModelPricingRequestDto {
}
exports.SyncModelPricingRequestDto = SyncModelPricingRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Conversion rate from USD to Credits (Credits per 1 USD)',
        example: 100,
        default: 100,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], SyncModelPricingRequestDto.prototype, "conversionRate", void 0);
class SyncModelPricingResponseDto {
}
exports.SyncModelPricingResponseDto = SyncModelPricingResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of models updated' }),
    __metadata("design:type", Number)
], SyncModelPricingResponseDto.prototype, "updatedCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of models created' }),
    __metadata("design:type", Number)
], SyncModelPricingResponseDto.prototype, "createdCount", void 0);
//# sourceMappingURL=sync-model-pricing.dto.js.map