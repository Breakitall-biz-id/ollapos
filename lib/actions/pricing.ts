'use server';

import { db } from '@/db';
import { priceRule, customerType, product } from '@/db/schema/pos';
import { eq } from 'drizzle-orm';

export async function calculateProductPrice(productId: string, customerTypeId: string, pangkalanId: string) {
  try {
    // Get base price for the product
    const priceRuleRecord = await db
      .select({ basePrice: priceRule.basePrice })
      .from(priceRule)
      .where(
        eq(priceRule.productId, productId) && eq(priceRule.pangkalanId, pangkalanId)
      )
      .limit(1);

    if (priceRuleRecord.length === 0) {
      throw new Error('Price rule not found');
    }

    // Get customer type discount
    const customerTypeRecord = await db
      .select({ discountPercent: customerType.discountPercent })
      .from(customerType)
      .where(eq(customerType.id, customerTypeId))
      .limit(1);

    if (customerTypeRecord.length === 0) {
      throw new Error('Customer type not found');
    }

    // Lookup product category
    const productRecord = await db
      .select({ category: product.category })
      .from(product)
      .where(eq(product.id, productId))
      .limit(1);

    const basePrice = Number(priceRuleRecord[0].basePrice);
    const isGas = productRecord.length > 0 && productRecord[0].category === 'gas';
    const discountPercent = isGas ? 0 : (customerTypeRecord[0].discountPercent || 0);

    // Calculate final price with discount
    const discountedPrice = basePrice * (1 - discountPercent / 100);

    return {
      success: true,
      data: {
        basePrice,
        discountPercent,
        finalPrice: Math.round(discountedPrice),
        discountAmount: Math.round(basePrice - discountedPrice)
      }
    };

  } catch (error) {
    console.error('Error calculating product price:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate price',
      data: null
    };
  }
}

export async function getCustomerTypes() {
  try {
    const customerTypes = await db
      .select({
        id: customerType.id,
        name: customerType.name,
        displayName: customerType.displayName,
        discountPercent: customerType.discountPercent,
        color: customerType.color,
        minSpent: customerType.minSpent
      })
      .from(customerType)
      .orderBy(customerType.discountPercent);

    return {
      success: true,
      data: customerTypes
    };

  } catch (error) {
    console.error('Error fetching customer types:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customer types',
      data: []
    };
  }
}