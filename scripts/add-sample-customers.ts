import { db } from '../db';
import { customer, customerType } from '../db/schema/pos';
import { eq } from 'drizzle-orm';

async function addSampleCustomers() {
  try {
    console.log('👥 Adding sample customers with different tiers...');

    // Get customer type IDs
    const types = await db.select().from(customerType);
    const silverType = types.find(t => t.name === 'silver');
    const goldType = types.find(t => t.name === 'gold');
    const platinumType = types.find(t => t.name === 'platinum');

    if (!silverType || !goldType || !platinumType) {
      throw new Error('Customer types not found. Please run migration first.');
    }

    // Add sample customers with different tiers
    const sampleCustomers = [
      {
        id: 'cust-silver-1',
        name: 'Pak Agus',
        typeId: silverType.id,
        phone: '0812-1111-2222',
        totalSpent: '600000', // Above Silver minimum
        notes: 'Regular customer since 2023'
      },
      {
        id: 'cust-silver-2',
        name: 'Ibu Wati',
        typeId: silverType.id,
        phone: '0813-3333-4444',
        totalSpent: '750000',
        notes: 'Prefers Gas 3kg'
      },
      {
        id: 'cust-gold-1',
        name: 'Pak Hendro',
        typeId: goldType.id,
        phone: '0814-5555-6666',
        totalSpent: '2000000', // Above Gold minimum
        notes: 'VIP customer since 2022'
      },
      {
        id: 'cust-gold-2',
        name: 'Ibu Siti',
        typeId: goldType.id,
        phone: '0815-7777-8888',
        totalSpent: '1500000',
        notes: 'Family customer'
      },
      {
        id: 'cust-platinum-1',
        name: 'Pak Budi Santoso',
        typeId: platinumType.id,
        phone: '0816-9999-0000',
        totalSpent: '5000000', // Above Platinum minimum
        notes: 'Platinum member - highest tier'
      },
      {
        id: 'cust-platinum-2',
        name: 'Ibu Ratna Wijaya',
        typeId: platinumType.id,
        phone: '0817-1212-3434',
        totalSpent: '3500000',
        notes: 'Business customer - bulk purchases'
      }
    ];

    for (const customerData of sampleCustomers) {
      try {
        await db.insert(customer).values({
          ...customerData,
          pangkalanId: 'pangkalan-2kjqYYJAQ5I_q-6ti14Ta',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`✅ Added ${customerData.name} (${customerData.typeId})`);
      } catch (error) {
        console.log(`⚠️ Customer ${customerData.name} already exists or error: ${error.message}`);
      }
    }

    // Update existing customers with spending
    const existingCustomers = await db.select().from(customer);
    for (const customer of existingCustomers) {
      if (customer.totalSpent === 0) {
        const randomSpent = Math.floor(Math.random() * 300000) + 100000;
        await db
          .update(customer)
          .set({
            totalSpent: randomSpent,
            updatedAt: new Date()
          })
          .where(eq(customer.id, customer.id));
        console.log(`💰 Updated spending for ${customer.name}: Rp${randomSpent.toLocaleString('id-ID')}`);
      }
    }

    console.log('\n✅ Sample customers added successfully!');
    console.log('📊 Customer Distribution:');
    console.log(`   • Regular: ${existingCustomers.filter(c => c.typeId === 'regular').length} customers`);
    console.log(`   • Silver: ${existingCustomers.filter(c => c.typeId === 'silver').length} customers`);
    console.log(`   • Gold: ${existingCustomers.filter(c => c.typeId === 'gold').length} customers`);
    console.log(`   • Platinum: ${existingCustomers.filter(c => c.typeId === 'platinum').length} customers`);

  } catch (error) {
    console.error('❌ Failed to add sample customers:', error);
    process.exit(1);
  }
}

addSampleCustomers().then(() => process.exit(0));