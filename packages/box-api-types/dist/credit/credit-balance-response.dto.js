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
exports.CreditBalanceResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class CreditBalanceResponseDto {
}
exports.CreditBalanceResponseDto = CreditBalanceResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current credit balance', example: 1200 }),
    __metadata("design:type", Number)
], CreditBalanceResponseDto.prototype, "creditBalance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current subscription plan', example: 'PRO' }),
    __metadata("design:type", String)
], CreditBalanceResponseDto.prototype, "subscriptionPlan", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Subscription status', example: 'ACTIVE' }),
    __metadata("design:type", String)
], CreditBalanceResponseDto.prototype, "subscriptionStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Subscription end date',
        example: '2023-12-31T23:59:59Z',
        required: false,
        nullable: true,
    }),
    __metadata("design:type", Date)
], CreditBalanceResponseDto.prototype, "subscriptionEndDate", void 0);
//# sourceMappingURL=credit-balance-response.dto.js.map