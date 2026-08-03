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
exports.RecordUsageResponseDto = exports.RecordUsageRequestDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class RecordUsageRequestDto {
}
exports.RecordUsageRequestDto = RecordUsageRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID (optional, for internal use)',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordUsageRequestDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Model name', example: 'gpt-4' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordUsageRequestDto.prototype, "model", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Input tokens used', example: 100 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RecordUsageRequestDto.prototype, "inputTokens", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Output tokens used', example: 50 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RecordUsageRequestDto.prototype, "outputTokens", void 0);
class RecordUsageResponseDto {
}
exports.RecordUsageResponseDto = RecordUsageResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Credits deducted', example: 10 }),
    __metadata("design:type", Number)
], RecordUsageResponseDto.prototype, "deductedCredits", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Remaining balance', example: 90 }),
    __metadata("design:type", Number)
], RecordUsageResponseDto.prototype, "remainingBalance", void 0);
//# sourceMappingURL=record-usage.dto.js.map