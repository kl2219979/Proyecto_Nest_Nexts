"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.benefitsForLevel = benefitsForLevel;
const membership_enums_1 = require("./enums/membership.enums");
function benefitsForLevel(level) {
    const table = {
        [membership_enums_1.MembershipLevel.BRONZE]: [
            {
                code: 'TICKET_5',
                description: '5% de descuento en entradas',
                discountPercent: 5,
            },
        ],
        [membership_enums_1.MembershipLevel.SILVER]: [
            {
                code: 'TICKET_10',
                description: '10% de descuento en entradas',
                discountPercent: 10,
            },
            {
                code: 'SNACK_5',
                description: '5% de descuento en confitería',
                discountPercent: 5,
            },
        ],
        [membership_enums_1.MembershipLevel.GOLD]: [
            {
                code: 'TICKET_15',
                description: '15% de descuento en entradas',
                discountPercent: 15,
            },
            {
                code: 'SNACK_10',
                description: '10% de descuento en confitería',
                discountPercent: 10,
            },
        ],
        [membership_enums_1.MembershipLevel.PLATINUM]: [
            {
                code: 'TICKET_20',
                description: '20% de descuento en entradas',
                discountPercent: 20,
            },
            {
                code: 'SNACK_15',
                description: '15% de descuento en confitería',
                discountPercent: 15,
            },
        ],
    };
    return table[level];
}
//# sourceMappingURL=membership-benefits.js.map