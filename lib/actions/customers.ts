'use server';

import { nanoid } from 'nanoid';
import { and, eq, ilike, or } from 'drizzle-orm';

import { db } from '@/db';
import { customer, customerType } from '@/db';
import { resolvePangkalanContext } from '@/lib/server/pangkalan-context';

type UpsertCustomerInput = {
  name: string;
  typeId: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export async function getCustomersForCurrentPangkalan() {
  try {
    const { pangkalan: currentPangkalan } = await resolvePangkalanContext();

    // Get customers for this pangkalan
    const customers = await db
      .select({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
        typeId: customer.typeId,
        typeName: customerType.name,
        displayName: customerType.displayName,
        discountPercent: customerType.discountPercent,
        color: customerType.color,
        totalSpent: customer.totalSpent,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      })
      .from(customer)
      .leftJoin(customerType, eq(customer.typeId, customerType.id))
      .where(eq(customer.pangkalanId, currentPangkalan.id))
      .orderBy(customer.name);

    return {
      success: true,
      data: customers
    };

  } catch (error) {
    console.error('Error fetching customers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customers',
      data: []
    };
  }
}

export async function getCustomerById(customerId: string) {
  try {
    const { pangkalan: currentPangkalan } = await resolvePangkalanContext();

    // Get customer
    const customerRecord = await db
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.id, customerId),
          eq(customer.pangkalanId, currentPangkalan.id)
        )
      )
      .limit(1);

    if (customerRecord.length === 0) {
      return {
        success: false,
        error: 'Customer not found',
        data: null
      };
    }

    return {
      success: true,
      data: customerRecord[0]
    };

  } catch (error) {
    console.error('Error fetching customer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customer',
      data: null
    };
  }
}

export async function searchCustomers(query: string) {
  try {
    const searchQuery = query.trim();
    if (!searchQuery) {
      return { success: true, data: [] };
    }
    const { pangkalan: currentPangkalan } = await resolvePangkalanContext();

    // Search customers
    const customers = await db
      .select({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        typeId: customer.typeId,
      })
      .from(customer)
      .where(
        and(
          eq(customer.pangkalanId, currentPangkalan.id),
          or(
            ilike(customer.name, `%${searchQuery}%`),
            ilike(customer.phone, `%${searchQuery}%`)
          )
        )
      )
      .limit(10);

    return {
      success: true,
      data: customers
    };

  } catch (error) {
    console.error('Error searching customers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search customers',
      data: []
    };
  }
}

export async function createCustomerForCurrentPangkalan(input: UpsertCustomerInput) {
  try {
    const { pangkalan: currentPangkalan } = await resolvePangkalanContext();
    const name = input.name?.trim();
    const typeId = input.typeId?.trim();

    if (!name) {
      return { success: false, error: 'Nama pelanggan wajib diisi', data: null };
    }

    if (!typeId) {
      return { success: false, error: 'Tipe pelanggan wajib dipilih', data: null };
    }

    const typeExists = await db
      .select({ id: customerType.id })
      .from(customerType)
      .where(eq(customerType.id, typeId))
      .limit(1);

    if (typeExists.length === 0) {
      return { success: false, error: 'Tipe pelanggan tidak ditemukan', data: null };
    }

    const now = new Date();
    const created = await db
      .insert(customer)
      .values({
        id: nanoid(),
        pangkalanId: currentPangkalan.id,
        name,
        typeId,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return { success: true, data: created[0] };
  } catch (error) {
    console.error('Error creating customer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menambahkan pelanggan',
      data: null,
    };
  }
}

export async function updateCustomerForCurrentPangkalan(customerId: string, input: UpsertCustomerInput) {
  try {
    if (!customerId) {
      return { success: false, error: 'ID pelanggan tidak ditemukan' };
    }

    const { pangkalan: currentPangkalan } = await resolvePangkalanContext();
    const name = input.name?.trim();
    const typeId = input.typeId?.trim();

    if (!name) {
      return { success: false, error: 'Nama pelanggan wajib diisi' };
    }

    if (!typeId) {
      return { success: false, error: 'Tipe pelanggan wajib dipilih' };
    }

    const target = await db
      .select({ id: customer.id })
      .from(customer)
      .where(and(eq(customer.id, customerId), eq(customer.pangkalanId, currentPangkalan.id)))
      .limit(1);

    if (target.length === 0) {
      return { success: false, error: 'Pelanggan tidak ditemukan' };
    }

    await db
      .update(customer)
      .set({
        name,
        typeId,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(eq(customer.id, customerId), eq(customer.pangkalanId, currentPangkalan.id)));

    return { success: true };
  } catch (error) {
    console.error('Error updating customer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memperbarui pelanggan',
    };
  }
}

export async function deleteCustomerForCurrentPangkalan(customerId: string) {
  try {
    if (!customerId) {
      return { success: false, error: 'ID pelanggan tidak ditemukan' };
    }

    const { pangkalan: currentPangkalan } = await resolvePangkalanContext();

    const target = await db
      .select({ id: customer.id })
      .from(customer)
      .where(and(eq(customer.id, customerId), eq(customer.pangkalanId, currentPangkalan.id)))
      .limit(1);

    if (target.length === 0) {
      return { success: false, error: 'Pelanggan tidak ditemukan' };
    }

    await db
      .delete(customer)
      .where(and(eq(customer.id, customerId), eq(customer.pangkalanId, currentPangkalan.id)));

    return { success: true };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menghapus pelanggan',
    };
  }
}
