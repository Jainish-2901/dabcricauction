/**
 * Mobile utility to resolve currency/budget units and formatting based on tournament configuration.
 */

export interface BudgetUnits {
    isKtoL: boolean;
    scale: 'K_TO_L' | 'L_TO_CR';
    largeUnit: string;
    smallUnit: string;
    largeName: string;
    smallName: string;
    formatLarge: (val: any) => string;
    formatSmall: (val: any) => string;
    formatAmount: (amount: any) => string;
    formatBid: (amount: any) => string;
}

export const getBudgetUnits = (tournament: any): BudgetUnits => {
    const isKtoL = tournament?.budgetScale === 'K_TO_L';
    const largeUnit = isKtoL ? 'L' : 'Cr';
    const smallUnit = isKtoL ? 'K' : 'L';

    const formatAmount = (amount: any) => {
        const num = Number(amount) || 0;
        if (num >= 100) {
            const large = num / 100;
            return large % 1 === 0 ? `${large} ${largeUnit}` : `${large.toFixed(2)} ${largeUnit}`;
        }
        return `${num} ${smallUnit}`;
    };

    return {
        isKtoL,
        scale: isKtoL ? 'K_TO_L' : 'L_TO_CR',
        largeUnit,
        smallUnit,
        largeName: isKtoL ? 'Lakhs' : 'Crores',
        smallName: isKtoL ? 'Thousands' : 'Lakhs',
        formatLarge: (val: any) => `₹${Number(val || 0).toFixed(2)} ${largeUnit}`,
        formatSmall: (val: any) => `₹${val || 0}${smallUnit}`,
        formatAmount,
        formatBid: (amount: any) => `₹${formatAmount(amount)}`
    };
};
