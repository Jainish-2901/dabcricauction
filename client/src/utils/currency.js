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

export const toBaseBidUnit = (value, unit, budgetScale = 'L_TO_CR') => {
    const val = Number(value) || 0;
    const isKtoL = budgetScale === 'K_TO_L';

    if (isKtoL) {
        if (unit === 'Cr') return val * 10000;
        if (unit === 'L') return val * 100;
        return val;
    } else {
        if (unit === 'Cr') return val * 100;
        if (unit === 'K') return Math.max(1, Math.round(val / 100));
        return val;
    }
};

export const getBidIncrement = (currentBid, rules, budgetScale = 'L_TO_CR') => {
    const isKtoL = budgetScale === 'K_TO_L';
    const defaultSmallUnit = isKtoL ? 'K' : 'L';

    const defaultList = isKtoL ? [
        { from: 0, fromUnit: 'K', upTo: 100, toUnit: 'K', increment: 5, incrementUnit: 'K' },
        { from: 1, fromUnit: 'L', upTo: 5, toUnit: 'L', increment: 10, incrementUnit: 'K' },
        { from: 5, fromUnit: 'L', upTo: 10, toUnit: 'L', increment: 25, incrementUnit: 'K' },
        { from: 10, fromUnit: 'L', upTo: 999999, toUnit: 'L', increment: 50, incrementUnit: 'K' }
    ] : [
        { from: 0, fromUnit: 'L', upTo: 1, toUnit: 'Cr', increment: 10, incrementUnit: 'L' },
        { from: 1, fromUnit: 'Cr', upTo: 5, toUnit: 'Cr', increment: 25, incrementUnit: 'L' },
        { from: 5, fromUnit: 'Cr', upTo: 10, toUnit: 'Cr', increment: 50, incrementUnit: 'L' },
        { from: 10, fromUnit: 'Cr', upTo: 999999, toUnit: 'Cr', increment: 100, incrementUnit: 'L' }
    ];

    const list = Array.isArray(rules) && rules.length > 0 ? rules : defaultList;

    const normalized = list.map((r, i, arr) => {
        const fUnit = r.fromUnit || r.rangeUnit || defaultSmallUnit;
        const tUnit = r.toUnit || r.rangeUnit || defaultSmallUnit;
        const iUnit = r.incrementUnit || defaultSmallUnit;
        const upToRaw = Number(r.upTo);
        const isUnlimited = isNaN(upToRaw) || upToRaw <= 0 || upToRaw >= 999999;

        const normUpTo = isUnlimited ? 999999999 : toBaseBidUnit(upToRaw, tUnit, budgetScale);
        const prevUpTo = i > 0 ? Number(arr[i - 1].upTo) : 0;
        const fromRaw = r.from !== undefined ? Number(r.from) : prevUpTo;
        const normFrom = toBaseBidUnit(fromRaw, fUnit, budgetScale);
        const normInc = toBaseBidUnit(Number(r.increment) || (isKtoL ? 5 : 10), iUnit, budgetScale);

        return {
            ...r,
            fromUnit: fUnit,
            toUnit: tUnit,
            incrementUnit: iUnit,
            normFrom,
            normUpTo,
            normInc: Math.max(1, normInc)
        };
    });

    normalized.sort((a, b) => a.normUpTo - b.normUpTo);

    const bid = Number(currentBid) || 0;
    for (const rule of normalized) {
        if (bid < rule.normUpTo) {
            return rule.normInc;
        }
    }

    return normalized[normalized.length - 1]?.normInc || (isKtoL ? 50 : 100);
};

export const formatSlabLabel = (rule, budgetScale = 'L_TO_CR') => {
    const isKtoL = budgetScale === 'K_TO_L';
    const defUnit = isKtoL ? 'K' : 'L';
    const fUnit = rule.fromUnit || rule.rangeUnit || defUnit;
    const tUnit = rule.toUnit || rule.rangeUnit || defUnit;
    const from = Number(rule.from) || 0;
    const upTo = Number(rule.upTo);
    const isUnlimited = isNaN(upTo) || upTo <= 0 || upTo >= 999999;

    if (isUnlimited) {
        return `Above ₹${from} ${fUnit}`;
    }
    return `₹${from} ${fUnit} - ₹${upTo} ${tUnit}`;
};

export const formatSlabIncrement = (rule, budgetScale = 'L_TO_CR') => {
    const isKtoL = budgetScale === 'K_TO_L';
    const defUnit = isKtoL ? 'K' : 'L';
    const iUnit = rule.incrementUnit || defUnit;
    const inc = Number(rule.increment) || (isKtoL ? 5 : 10);
    return `+₹${inc} ${iUnit}`;
};

export const formatCurrencyAmount = (amount, budgetScale = 'L_TO_CR') => {
    const num = Number(amount) || 0;
    const isKtoL = budgetScale === 'K_TO_L';

    if (isKtoL) {
        // Base value is in K (Thousands)
        // >= 10,000 K is >= 1 Cr (1 Cr = 100 L = 10,000 K)
        if (num >= 10000) {
            const cr = num / 10000;
            return cr % 1 === 0 ? `${cr} Cr` : `${Number(cr.toFixed(2))} Cr`;
        }
        // >= 100 K is >= 1 L (1 L = 100 K)
        if (num >= 100) {
            const l = num / 100;
            return l % 1 === 0 ? `${l} L` : `${Number(l.toFixed(2))} L`;
        }
        return `${Number(num.toFixed(2))} K`;
    } else {
        // Base value is in L (Lakhs)
        // >= 100 L is >= 1 Cr (1 Cr = 100 L)
        if (num >= 100) {
            const cr = num / 100;
            return cr % 1 === 0 ? `${cr} Cr` : `${Number(cr.toFixed(2))} Cr`;
        }
        // < 1 L and > 0, e.g. 0.5 L = 50 K
        if (num > 0 && num < 1) {
            const k = Math.round(num * 100);
            return `${k} K`;
        }
        return `${Number(num.toFixed(2))} L`;
    }
};

export const formatCurrencyPrice = (amount, budgetScale = 'L_TO_CR') => {
    return `₹${formatCurrencyAmount(amount, budgetScale)}`;
};

export const getBudgetUnits = (tournament) => {
    const isKtoL = tournament?.budgetScale === 'K_TO_L';
    const largeUnit = isKtoL ? 'L' : 'Cr';
    const smallUnit = isKtoL ? 'K' : 'L';
    const scale = isKtoL ? 'K_TO_L' : 'L_TO_CR';

    const formatAmount = (amount) => formatCurrencyAmount(amount, scale);
    const formatPrice = (amount) => `₹${formatAmount(amount)}`;

    return {
        isKtoL,
        scale,
        largeUnit,    // 'Cr' or 'L'
        smallUnit,    // 'L' or 'K'
        largeName: isKtoL ? 'Lakhs' : 'Crores',
        smallName: isKtoL ? 'Thousands' : 'Lakhs',
        formatLarge: (val) => `₹${Number(val || 0).toFixed(2)} ${largeUnit}`,
        formatSmall: (val) => `₹${val || 0}${smallUnit}`,
        formatAmount,
        formatPrice,
        formatBid: (amount) => formatPrice(amount)
    };
};
