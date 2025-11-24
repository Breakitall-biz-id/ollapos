import { db } from '../db';
import { customer, customerType, priceRule } from '../db/schema/pos';
import { eq, and } from 'drizzle-orm';

async function migrateCustomerTypes() {
  try {
    console.log('🔄 Migrating customer system to support multiple types...');

    // Create customer types
    const customerTypes = [
      {
        id: 'regular',
        name: 'regular',
        displayName: 'Regular',
        discountPercent: 0,
        color: '#94a3b8', // slate-500
        minSpent: '0'
      },
      {
        id: 'silver',
        name: 'silver',
        displayName: 'Silver',
        discountPercent: 5,
        color: '#e2e8f0', // silver-300
        minSpent: '500000' // Rp 500,000
      },
      {
        id: 'gold',
        name: 'gold',
        displayName: 'Gold',
        discountPercent: 10,
        color: '#fbbf24', // amber-400
        minSpent: '1500000' // Rp 1,500,000
      },
      {
        id: 'platinum',
        name: 'platinum',
        displayName: 'Platinum',
        discountPercent: 15,
        color: '#f3f4f6', // gray-100
        minSpent: '3000000' // Rp 3,000,000
      }
    ];

    for (const type of customerTypes) {
      await db.insert(customerType).values(type).onConflictDoUpdate({
        target: customerType.name,
        set: type
      });
      console.log(`✅ Created/Updated customer type: ${type.displayName}`);
    }

    // Migrate existing customers
    const existingCustomers = await db.select().from(customer);

    for (const cust of existingCustomers) {
      // Convert old isVip to new typeId
      let typeId = 'regular';
      if (cust.isVip) {
        // For existing VIP customers, assign Gold tier by default
        typeId = 'gold';
      }

      await db
        .update(customer)
        .set({
          typeId,
          updatedAt: new Date()
        })
        .where(eq(customer.id, cust.id));

      console.log(`👤 Migrated customer: ${cust.name} -> ${typeId}`);
    }

    // Update price rules to use basePrice
    const existingPriceRules = await db.select().from(priceRule);

    for (const rule of existingPriceRules) {
      if (rule.priceRegular && rule.priceVip) {
        // Use regular price as base price
        await db
          .update(priceRule)
          .set({
            basePrice: rule.priceRegular,
            updatedAt: new Date()
          })
          .where(eq(priceRule.id, rule.id));

        console.log(`💰 Updated price rule for product ID: ${rule.productId}`);
      }
    }

    console.log('\n✅ Customer system migration completed!');
    console.log('📊 Customer Types:');
    console.log('   • Regular: 0% discount');
    console.log('   • Silver: 5% discount (min. Rp 500,000)');
    console.log('   • Gold: 10% discount (min. Rp 1,500,000)');
    console.log('   • Platinum: 15% discount (min. Rp 3,000,000)');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateCustomerTypes().then(() => process.exit(0));