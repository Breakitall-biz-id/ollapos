'use server';

import { db } from '@/db';
import { customer, pangkalan, customerType } from '@/db';
import { eq, and, ilike } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';

// Helper function to get current session
async function getCurrentSession() {
  try {
    const cookieStore = await cookies();
    const session = await auth.api.getSession({
      headers: {
        cookie: cookieStore.toString()
      }
    });
    return session;
  } catch (error) {
    console.error('Session error:', error);
    return null;
  }
}

export async function getCustomersForCurrentPangkalan() {
  try {
    // TEMPORARY: Hardcode pangkalan ID to test database connection
    // TODO: Fix session authentication later
    const hardcodedPangkalanId = 'pangkalan-2kjqYYJAQ5I_q-6ti14Ta';

    // Find pangkalan record
    const pangkalanRecord = await db
      .select()
      .from(pangkalan)
      .where(eq(pangkalan.id, hardcodedPangkalanId))
      .limit(1);

    if (pangkalanRecord.length === 0) {
      throw new Error(`Pangkalan not found with ID: ${hardcodedPangkalanId}`);
    }

    const currentPangkalan = pangkalanRecord[0];
    console.log('✅ Using pangkalan for customers:', currentPangkalan.name);

    // Get customers for this pangkalan
    const customers = await db
      .select({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        typeId: customer.typeId,
        typeName: customerType.name,
        displayName: customerType.displayName,
        discountPercent: customerType.discountPercent,
        color: customerType.color,
        totalSpent: customer.totalSpent,
        createdAt: customer.createdAt,
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
    // Get current user session
    const session = await getCurrentSession();

    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    // Find pangkalan for current user
    const pangkalanRecord = await db
      .select()
      .from(pangkalan)
      .where(eq(pangkalan.userId, session.user.id))
      .limit(1);

    if (pangkalanRecord.length === 0) {
      throw new Error('Pangkalan not found');
    }

    const currentPangkalan = pangkalanRecord[0];

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
    // Get current user session
    const session = await getCurrentSession();

    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized', data: [] };
    }

    // Find pangkalan for current user
    const pangkalanRecord = await db
      .select()
      .from(pangkalan)
      .where(eq(pangkalan.userId, session.user.id))
      .limit(1);

    if (pangkalanRecord.length === 0) {
      throw new Error('Pangkalan not found');
    }

    const currentPangkalan = pangkalanRecord[0];

    // Search customers
    const customers = await db
      .select({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        isVip: customer.isVip,
      })
      .from(customer)
      .where(
        and(
          eq(customer.pangkalanId, currentPangkalan.id),
          ilike(customer.name, `%${query}%`)
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