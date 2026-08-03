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
exports.GetCreditHistoryResponseDto = exports.CreditTransactionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class CreditTransactionDto {
}
exports.CreditTransactionDto = CreditTransactionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Transaction ID', example: '1' }),
    __metadata("design:type", String)
], CreditTransactionDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Amount changed', example: -10 }),
    __metadata("design:type", Number)
], CreditTransactionDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Transaction type', example: 'USAGE' }),
    __metadata("design:type", String)
], CreditTransactionDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description',
        example: 'GPT-4 Request',
        required: false,
        nullable: true,
    }),
    __metadata("design:type", String)
], CreditTransactionDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Created at', example: '2023-11-25T10:00:00Z' }),
    __metadata("design:type", Date)
], CreditTransactionDto.prototype, "createdAt", void 0);
class GetCreditHistoryResponseDto {
}
exports.GetCreditHistoryResponseDto = GetCreditHistoryResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'List of transactions',
        type: [CreditTransactionDto],
    }),
    __metadata("design:type", Array)
], GetCreditHistoryResponseDto.prototype, "transactions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total count', example: 100 }),
    __metadata("design:type", Number)
], GetCreditHistoryResponseDto.prototype, "total", void 0);
//# sourceMappingURL=credit-history-response.dto.js.map