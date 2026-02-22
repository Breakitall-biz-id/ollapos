'use server';

import { nanoid } from 'nanoid';

import { db } from '@/db';
import { product, inventory, priceRule, customer, type Pangkalan } from '@/db';
import { eq, and, ilike, or } from 'drizzle-orm';
import { resolvePangkalanContext } from '@/lib/server/pangkalan-context';

type ProductCategory = 'gas' | 'water' | 'general';

export type ProductListItem = {
  id: string;
  name: string;
  category: ProductCategory;
  imageUrl: string | null;
  createdAt: string | null;
  basePrice: number;
  costPrice: number;
  stock: number;
  stockEmpty: number;
  isGlobal: boolean;
  unit: string;
  description: string;
};

export async function getProductsForCurrentPangkalan(category?: string): Promise<{
  success: boolean;
  data: ProductListItem[];
  error?: string;
}> {
  try {
    const currentPangkalan = await getActivePangkalan();

    // Get products with inventory and pricing
    const productsQuery = db
      .select({
        id: product.id,
        name: product.name,
        category: product.category,
        imageUrl: product.imageUrl,
        isGlobal: product.isGlobal,
        pangkalanId: product.pangkalanId,
        createdAt: product.createdAt,
        basePrice: priceRule.basePrice,
        costPrice: priceRule.costPrice,
        stockFilled: inventory.stockFilled,
        stockEmpty: inventory.stockEmpty,
      })
      .from(product)
      .leftJoin(
        inventory,
        and(
          eq(inventory.productId, product.id),
          eq(inventory.pangkalanId, currentPangkalan.id)
        )
      )
      .leftJoin(
        priceRule,
        and(
          eq(priceRule.productId, product.id),
          eq(priceRule.pangkalanId, currentPangkalan.id)
        )
      )
      .where(and(
        or(
          eq(product.isGlobal, true),
          eq(product.pangkalanId, currentPangkalan.id)
        ),
        category ? eq(product.category, category) : undefined
      ));

    const products = await productsQuery;

    const mapped: ProductListItem[] = products.map((record) => ({
      id: record.id,
      name: record.name,
      category: record.category as ProductCategory,
      imageUrl: record.imageUrl,
      createdAt: record.createdAt ? record.createdAt.toISOString() : null,
      basePrice: record.basePrice ? Number(record.basePrice) : 0,
      costPrice: record.costPrice ? Number(record.costPrice) : 0,
      stock: typeof record.stockFilled === 'number'
        ? record.stockFilled
        : Number(record.stockFilled ?? 0),
      stockEmpty: typeof record.stockEmpty === 'number'
        ? record.stockEmpty
        : Number(record.stockEmpty ?? 0),
      isGlobal: record.isGlobal ?? false,
      unit: 'pcs',
      description: '',
    }));

    return {
      success: true,
      data: mapped,
    };

  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch products',
      data: []
    };
  }
}

type UpsertProductInput = {
  name: string;
  category: ProductCategory;
  basePrice: number;
  costPrice: number;
  stock?: number;
  imageUrl?: string | null;
  description?: string | null;
  unit?: string | null;
};

async function getActivePangkalan(): Promise<Pangkalan> {
  const { pangkalan } = await resolvePangkalanContext();
  return pangkalan;
}

function normalizePrice(value: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error('Harga produk tidak valid');
  }
  return Number(numeric.toFixed(2));
}

function normalizeStock(value?: number) {
  if (value === undefined || value === null) return 0;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

export async function createProductForCurrentPangkalan(input: UpsertProductInput): Promise<{
  success: boolean;
  data?: ProductListItem;
  error?: string;
}> {
  try {
    const currentPangkalan = await getActivePangkalan();
    const name = input.name?.trim();

    if (!name) {
      return { success: false, error: 'Nama produk wajib diisi' };
    }

    const basePrice = normalizePrice(input.basePrice);
    const costPrice = normalizePrice(input.costPrice);
    const stockFilled = normalizeStock(input.stock);
    const now = new Date();
    const unit = (input.unit ?? 'pcs').trim() || 'pcs';
    const description = input.description?.trim() ?? '';

    const existingProduct = await db
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.name, name),
          eq(product.pangkalanId, currentPangkalan.id)
        )
      )
      .limit(1);

    if (existingProduct.length > 0) {
      return { success: false, error: 'Nama produk sudah digunakan untuk pangkalan ini' };
    }

    const createdProduct = await db.transaction(async (tx) => {
      const productId = nanoid();

      await tx.insert(product).values({
        id: productId,
        name,
        category: input.category,
        imageUrl: input.imageUrl ?? null,
        isGlobal: false,
        pangkalanId: currentPangkalan.id,
        createdAt: now,
      });

      await tx.insert(priceRule).values({
        id: nanoid(),
        pangkalanId: currentPangkalan.id,
        productId,
        basePrice: basePrice.toFixed(2),
        costPrice: costPrice.toFixed(2),
        updatedAt: now,
      });

      await tx.insert(inventory).values({
        id: nanoid(),
        pangkalanId: currentPangkalan.id,
        productId,
        stockFilled,
        stockEmpty: 0,
        updatedAt: now,
      });

      return {
        id: productId,
        createdAt: now.toISOString(),
        stock: stockFilled,
      };
    });

    return {
      success: true,
      data: {
        id: createdProduct.id,
        name,
        category: input.category,
        basePrice,
        costPrice,
        stock: createdProduct.stock,
        unit,
        imageUrl: input.imageUrl ?? null,
        description,
        createdAt: createdProduct.createdAt,
        stockEmpty: 0,
        isGlobal: false,
      },
    };
  } catch (error) {
    console.error('Error creating product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create product',
    };
  }
}

export async function updateProductForCurrentPangkalan(
  productId: string,
  input: UpsertProductInput
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!productId) {
      return { success: false, error: 'ID produk tidak ditemukan' };
    }

    const currentPangkalan = await getActivePangkalan();
    const name = input.name?.trim();

    if (!name) {
      return { success: false, error: 'Nama produk wajib diisi' };
    }

    const basePrice = normalizePrice(input.basePrice);
    const costPrice = normalizePrice(input.costPrice);
    const stockFilled = normalizeStock(input.stock);

    const existingProduct = await db
      .select({
        id: product.id,
        pangkalanId: product.pangkalanId,
      })
      .from(product)
      .where(eq(product.id, productId))
      .limit(1);

    if (existingProduct.length === 0 || existingProduct[0].pangkalanId !== currentPangkalan.id) {
      return { success: false, error: 'Produk tidak ditemukan untuk pangkalan ini' };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(product)
        .set({
          name,
          category: input.category,
          imageUrl: input.imageUrl ?? null,
        })
        .where(eq(product.id, productId));

      await tx
        .update(priceRule)
        .set({
          basePrice: basePrice.toFixed(2),
          costPrice: costPrice.toFixed(2),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(priceRule.productId, productId),
            eq(priceRule.pangkalanId, currentPangkalan.id)
          )
        );

      const existingInventory = await tx
        .select({
          id: inventory.id,
        })
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, productId),
            eq(inventory.pangkalanId, currentPangkalan.id)
          )
        )
        .limit(1);

      if (existingInventory.length > 0) {
        await tx
          .update(inventory)
          .set({
            stockFilled,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, existingInventory[0].id));
      } else {
        await tx.insert(inventory).values({
          id: nanoid(),
          pangkalanId: currentPangkalan.id,
          productId,
          stockFilled,
          stockEmpty: 0,
          updatedAt: new Date(),
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update product',
    };
  }
}

export async function deleteProductForCurrentPangkalan(productId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!productId) {
      return { success: false, error: 'ID produk tidak ditemukan' };
    }

    const currentPangkalan = await getActivePangkalan();

    const productRecord = await db
      .select({
        id: product.id,
        pangkalanId: product.pangkalanId,
        isGlobal: product.isGlobal,
      })
      .from(product)
      .where(eq(product.id, productId))
      .limit(1);

    if (productRecord.length === 0) {
      return { success: false, error: 'Produk tidak ditemukan' };
    }

    const target = productRecord[0];
    if (target.isGlobal || target.pangkalanId !== currentPangkalan.id) {
      return { success: false, error: 'Produk global tidak dapat dihapus dari sini' };
    }

    await db.delete(product).where(eq(product.id, productId));

    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete product',
    };
  }
}

export async function getProductPriceForCustomer(productId: string, customerId?: string) {
  try {
    const currentPangkalan = await getActivePangkalan();

    // Get price rule
    const priceRuleRows = await db
      .select({
        basePrice: priceRule.basePrice,
        costPrice: priceRule.costPrice,
      })
      .from(priceRule)
      .where(
        and(
          eq(priceRule.productId, productId),
          eq(priceRule.pangkalanId, currentPangkalan.id)
        )
      )
      .limit(1);

    if (priceRuleRows.length === 0) {
      throw new Error('Price rule not found');
    }

    // If customer is provided, check their type
    let customerTypeId: string | null = null;
    if (customerId) {
      const customerRecord = await db
        .select({ typeId: customer.typeId })
        .from(customer)
        .where(
          and(
            eq(customer.id, customerId),
            eq(customer.pangkalanId, currentPangkalan.id)
          )
        )
        .limit(1);

      if (customerRecord.length > 0) {
        customerTypeId = customerRecord[0].typeId;
      }
    }

    const rule = priceRuleRows[0];
    const basePrice = Number(rule.basePrice);

    return {
      success: true,
      data: {
        price: basePrice,
        customerTypeId,
        basePrice,
        costPrice: Number(rule.costPrice),
      }
    };

  } catch (error) {
    console.error('Error fetching product price:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch product price',
      data: null
    };
  }
}

export async function searchProducts(query: string) {
  try {
    const currentPangkalan = await getActivePangkalan();

    // Search products
    const products = await db
      .select({
        id: product.id,
        name: product.name,
        category: product.category,
        imageUrl: product.imageUrl,
        basePrice: priceRule.basePrice,
        costPrice: priceRule.costPrice,
        stockFilled: inventory.stockFilled,
      })
      .from(product)
      .leftJoin(
        inventory,
        and(
          eq(inventory.productId, product.id),
          eq(inventory.pangkalanId, currentPangkalan.id)
        )
      )
      .leftJoin(
        priceRule,
        and(
          eq(priceRule.productId, product.id),
          eq(priceRule.pangkalanId, currentPangkalan.id)
        )
      )
      .where(
        and(
          ilike(product.name, `%${query}%`),
          or(
            eq(product.isGlobal, true),
            eq(product.pangkalanId, currentPangkalan.id)
          )
        )
      )
      .limit(10);

    return {
      success: true,
      data: products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category as 'gas' | 'water' | 'general',
        imageUrl: p.imageUrl,
        price: p.basePrice || 0,
        stock: p.stockFilled || 0,
      }))
    };

  } catch (error) {
    console.error('Error searching products:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search products',
      data: []
    };
  }
}
