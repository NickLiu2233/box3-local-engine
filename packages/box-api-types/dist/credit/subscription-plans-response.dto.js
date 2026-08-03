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
exports.GetSubscriptionPlansResponseDto = exports.SubscriptionPlanDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class SubscriptionPlanDto {
}
exports.SubscriptionPlanDto = SubscriptionPlanDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Plan ID', example: 1 }),
    __metadata("design:type", Number)
], SubscriptionPlanDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Plan name (code)', example: 'PRO' }),
    __metadata("design:type", String)
], SubscriptionPlanDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Display name', example: 'Professional' }),
    __metadata("design:type", String)
], SubscriptionPlanDto.prototype, "displayName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Price in cents', example: 1000 }),
    __metadata("design:type", Number)
], SubscriptionPlanDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Monthly credits', example: 1200 }),
    __metadata("design:type", Number)
], SubscriptionPlanDto.prototype, "monthlyCredits", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description',
        example: 'Best for power users',
        nullable: true,
    }),
    __metadata("design:type", String)
], SubscriptionPlanDto.prototype, "description", void 0);
class GetSubscriptionPlansResponseDto {
}
exports.GetSubscriptionPlansResponseDto = GetSubscriptionPlansResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'List of subscription plans',
        type: [SubscriptionPlanDto],
    }),
    __metadata("design:type", Array)
], GetSubscriptionPlansResponseDto.prototype, "plans", void 0);
//# sourceMappingURL=subscription-plans-response.dto.js.map