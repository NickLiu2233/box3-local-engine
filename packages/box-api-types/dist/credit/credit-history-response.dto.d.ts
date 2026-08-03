export declare class CreditTransactionDto {
    id: string;
    amount: number;
    type: string;
    description: string | null;
    createdAt: Date;
}
export declare class GetCreditHistoryResponseDto {
    transactions: CreditTransactionDto[];
    total: number;
}
//# sourceMappingURL=credit-history-response.dto.d.ts.map