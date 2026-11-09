/**
 * Utility to resolve currency/budget units and formatting based on tournament configuration.
 *
 * Scales:
 * 1. 'L_TO_CR' (Standard / Professional):
 *    - Small Unit (Bids, Base Price, Slabs): Lakhs (L)
 *    - Large Unit (Team Purse Budget, Spent, Remaining): Crores (Cr)
 *    - 1 Cr = 100 L
 *
 * 2. 'K_TO_L' (Local / Club / Community):
 *    - Small Unit (Bids, Base Price, Slabs): Thousands (K)
 *    - Large Unit (Team Purse Budget, Spent, Remaining): Lakhs (L)
 *    - 1 L = 100 K
 */

export const getBudgetUnits = (tournament) => {
    const isKtoL = tournament?.budgetScale === 'K_TO_L';
    const largeUnit = isKtoL ? 'L' : 'Cr';
    const smallUnit = isKtoL ? 'K' : 'L';

    const formatAmount = (amount) => {
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
        largeUnit,    // 'Cr' or 'L'
        smallUnit,    // 'L' or 'K'
        largeName: isKtoL ? 'Lakhs' : 'Crores',
        smallName: isKtoL ? 'Thousands' : 'Lakhs',
        formatLarge: (val) => `₹${Number(val || 0).toFixed(2)} ${largeUnit}`,
        formatSmall: (val) => `₹${val || 0}${smallUnit}`,
        formatAmount,
        formatBid: (amount) => `₹${formatAmount(amount)}`
    };
};
