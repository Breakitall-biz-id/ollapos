/**
 * Client-side discount resolution utility.
 * This is NOT a server action — it runs on the client using pre-loaded data.
 */

export type DiscountType = 'percentage' | 'fixed';

export interface ProductTierPricingItem {
    id: string;
    pangkalanId: string;
    productId: string;
    customerTypeId: string;
    discountType: DiscountType;
    discountValue: number;
}

export interface ResolvedDiscount {
    type: DiscountType;
    value: number;
    finalPrice: number;
    discountAmount: number;
    source: 'product_tier' | 'global_tier' | 'none';
}

/**
 * Client-side discount resolution (for cart-store & pricing page, no DB calls).
 * Uses pre-loaded discount data.
 *
 * Priority: product_tier > global_tier > none
 */
export function resolveDiscountClient(
    productId: string,
    customerTypeId: string | undefined,
    basePrice: number,
    productCategory: string,
    productTierPricings: ProductTierPricingItem[],
    globalDiscountPercent: number
): ResolvedDiscount {
    const noDiscount: ResolvedDiscount = {
        type: 'percentage',
        value: 0,
        finalPrice: basePrice,
        discountAmount: 0,
        source: 'none',
    };

    if (!customerTypeId) return noDiscount;

    // 1. Check product-level override
    const specific = productTierPricings.find(
        p => p.productId === productId && p.customerTypeId === customerTypeId
    );

    if (specific) {
        let finalPrice: number;
        let discountAmount: number;

        if (specific.discountType === 'percentage') {
            discountAmount = Math.round(basePrice * specific.discountValue / 100);
            finalPrice = basePrice - discountAmount;
        } else {
            discountAmount = specific.discountValue;
            finalPrice = Math.max(0, basePrice - specific.discountValue);
        }

        return {
            type: specific.discountType,
            value: specific.discountValue,
            finalPrice,
            discountAmount,
            source: 'product_tier',
        };
    }

    // 2. Fallback to global tier discount
    if (globalDiscountPercent > 0) {
        const discountAmount = Math.round(basePrice * globalDiscountPercent / 100);
        const finalPrice = basePrice - discountAmount;

        return {
            type: 'percentage',
            value: globalDiscountPercent,
            finalPrice,
            discountAmount,
            source: 'global_tier',
        };
    }

    return noDiscount;
}
