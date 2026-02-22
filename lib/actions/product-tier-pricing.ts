'use server';

import { db } from '@/db';
import { productTierPricing, customerType } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';
import { resolvePangkalanContext } from '@/lib/server/pangkalan-context';
import { nanoid } from 'nanoid';

import type { DiscountType, ProductTierPricingItem, ResolvedDiscount } from '@/lib/discount-utils';

/**
 * Get all product tier pricing rules for current pangkalan
 */
export async function getProductTierPricings() {
    try {
        const ctx = await resolvePangkalanContext();

        const pricings = await db
            .select({
                id: productTierPricing.id,
                pangkalanId: productTierPricing.pangkalanId,
                productId: productTierPricing.productId,
                customerTypeId: productTierPricing.customerTypeId,
                discountType: productTierPricing.discountType,
                discountValue: productTierPricing.discountValue,
            })
            .from(productTierPricing)
            .where(eq(productTierPricing.pangkalanId, ctx.pangkalan.id));

        return {
            success: true,
            data: pricings.map(p => ({
                ...p,
                discountValue: Number(p.discountValue),
            }))
        };
    } catch (error) {
        console.error('Error fetching product tier pricings:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch product tier pricings',
            data: [] as ProductTierPricingItem[]
        };
    }
}

/**
 * Upsert a product tier pricing rule
 */
export async function upsertProductTierPricing(
    productId: string,
    customerTypeId: string,
    discountType: DiscountType,
    discountValue: number
) {
    try {
        const ctx = await resolvePangkalanContext();

        // Check if already exists
        const existing = await db
            .select({ id: productTierPricing.id })
            .from(productTierPricing)
            .where(and(
                eq(productTierPricing.productId, productId),
                eq(productTierPricing.customerTypeId, customerTypeId),
                eq(productTierPricing.pangkalanId, ctx.pangkalan.id)
            ))
            .limit(1);

        if (existing.length > 0) {
            // Update
            await db
                .update(productTierPricing)
                .set({
                    discountType,
                    discountValue: discountValue.toString(),
                    updatedAt: new Date(),
                })
                .where(eq(productTierPricing.id, existing[0].id));

            return { success: true, id: existing[0].id };
        } else {
            // Insert
            const id = nanoid();
            await db.insert(productTierPricing).values({
                id,
                pangkalanId: ctx.pangkalan.id,
                productId,
                customerTypeId,
                discountType,
                discountValue: discountValue.toString(),
                updatedAt: new Date(),
            });

            return { success: true, id };
        }
    } catch (error) {
        console.error('Error upserting product tier pricing:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save product tier pricing'
        };
    }
}

/**
 * Delete a product tier pricing rule
 */
export async function deleteProductTierPricing(
    productId: string,
    customerTypeId: string
) {
    try {
        const ctx = await resolvePangkalanContext();

        await db
            .delete(productTierPricing)
            .where(and(
                eq(productTierPricing.productId, productId),
                eq(productTierPricing.customerTypeId, customerTypeId),
                eq(productTierPricing.pangkalanId, ctx.pangkalan.id)
            ));

        return { success: true };
    } catch (error) {
        console.error('Error deleting product tier pricing:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete product tier pricing'
        };
    }
}

/**
 * Resolve the best discount for a given product + customer type + pangkalan
 * Priority: product_tier > global_tier > none
 */
export async function resolveDiscount(
    productId: string,
    customerTypeId: string | undefined,
    basePrice: number,
    productCategory?: string
): Promise<ResolvedDiscount> {
    const noDiscount: ResolvedDiscount = {
        type: 'percentage',
        value: 0,
        finalPrice: basePrice,
        discountAmount: 0,
        source: 'none',
    };

    // No customer type = no discount
    if (!customerTypeId) return noDiscount;

    try {
        const ctx = await resolvePangkalanContext();

        // 1. Check product-tier-specific pricing
        const specific = await db
            .select({
                discountType: productTierPricing.discountType,
                discountValue: productTierPricing.discountValue,
            })
            .from(productTierPricing)
            .where(and(
                eq(productTierPricing.productId, productId),
                eq(productTierPricing.customerTypeId, customerTypeId),
                eq(productTierPricing.pangkalanId, ctx.pangkalan.id)
            ))
            .limit(1);

        if (specific.length > 0) {
            const type = specific[0].discountType as DiscountType;
            const value = Number(specific[0].discountValue);

            let finalPrice: number;
            let discountAmount: number;

            if (type === 'percentage') {
                discountAmount = Math.round(basePrice * value / 100);
                finalPrice = basePrice - discountAmount;
            } else {
                // fixed
                discountAmount = value;
                finalPrice = Math.max(0, basePrice - value);
            }

            return {
                type,
                value,
                finalPrice,
                discountAmount,
                source: 'product_tier',
            };
        }

        // 2. Fallback to global tier discount
        const tierRecord = await db
            .select({ discountPercent: customerType.discountPercent })
            .from(customerType)
            .where(eq(customerType.id, customerTypeId))
            .limit(1);

        if (tierRecord.length > 0 && tierRecord[0].discountPercent > 0) {
            const percent = tierRecord[0].discountPercent;
            const discountAmount = Math.round(basePrice * percent / 100);
            const finalPrice = basePrice - discountAmount;

            return {
                type: 'percentage',
                value: percent,
                finalPrice,
                discountAmount,
                source: 'global_tier',
            };
        }

        return noDiscount;
    } catch (error) {
        console.error('Error resolving discount:', error);
        return noDiscount;
    }
}
