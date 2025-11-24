import { db } from '../db';
import { product, inventory, priceRule, customer } from '../db/schema/pos';
import { eq } from 'drizzle-orm';

const pangkalanId = 'pangkalan-2kjqYYJAQ5I_q-6ti14Ta';

async function seedSampleData() {
  try {
    console.log('🌱 Seeding sample data for POS testing...');

    // Get all products
    const products = await db.select().from(product);
    console.log(`Found ${products.length} products in database`);

    // Add inventory records for each product
    for (const product of products) {
      const existingInventory = await db
        .select()
        .from(inventory)
        .where(eq(inventory.productId, product.id))
        .where(eq(inventory.pangkalanId, pangkalanId));

      if (existingInventory.length === 0) {
        await db.insert(inventory).values({
          id: `inv-${product.id}-${pangkalanId}`,
          productId: product.id,
          pangkalanId: pangkalanId,
          stockFilled: Math.floor(Math.random() * 50) + 10, // 10-60 units
          stockEmpty: Math.floor(Math.random() * 20) + 5, // 5-25 units
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`✅ Added inventory for ${product.name}`);
      } else {
        console.log(`📦 Inventory already exists for ${product.name}`);
      }

      // Add price rules for each product
      const existingPriceRule = await db
        .select()
        .from(priceRule)
        .where(eq(priceRule.productId, product.id))
        .where(eq(priceRule.pangkalanId, pangkalanId));

      if (existingPriceRule.length === 0) {
        let priceRegular = 0;
        let priceVip = 0;

        // Set prices based on product category
        if (product.category === 'gas') {
          if (product.name.includes('3kg')) {
            priceRegular = 18000;
            priceVip = 17500;
          } else if (product.name.includes('12kg')) {
            priceRegular = 65000;
            priceVip = 63000;
          } else {
            priceRegular = 35000;
            priceVip = 34000;
          }
        } else if (product.category === 'water') {
          priceRegular = 5000;
          priceVip = 4500;
        } else {
          priceRegular = 10000;
          priceVip = 9500;
        }

        await db.insert(priceRule).values({
          id: `price-${product.id}-${pangkalanId}`,
          productId: product.id,
          pangkalanId: pangkalanId,
          priceRegular,
          priceVip,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`💰 Added pricing for ${product.name}: Rp${priceRegular.toLocaleString('id-ID')} (VIP: Rp${priceVip.toLocaleString('id-ID')})`);
      } else {
        console.log(`💵 Pricing already exists for ${product.name}`);
      }
    }

    // Add sample customers
    const sampleCustomers = [
      { name: 'Pak Budi', phone: '0812-3456-7890', isVip: true },
      { name: 'Ibu Siti', phone: '0813-2345-6789', isVip: true },
      { name: 'Pak Ahmad', phone: '0814-1234-5678', isVip: false },
      { name: 'Ibu Ratna', phone: '0815-9876-5432', isVip: false },
      { name: 'Pak Joko', phone: '0816-8765-4321', isVip: true },
    ];

    for (const customerData of sampleCustomers) {
      const existingCustomer = await db
        .select()
        .from(customer)
        .where(eq(customer.pangkalanId, pangkalanId))
        .where(eq(customer.name, customerData.name));

      if (existingCustomer.length === 0) {
        await db.insert(customer).values({
          id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          pangkalanId: pangkalanId,
          name: customerData.name,
          phone: customerData.phone,
          isVip: customerData.isVip,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`👤 Added customer: ${customerData.name} ${customerData.isVip ? '(VIP)' : '(Regular)'}`);
      } else {
        console.log(`👥 Customer ${customerData.name} already exists`);
      }
    }

    console.log('\n✅ Sample data seeding completed!');
    console.log('🏪 Pangkalan Bude Sri is now ready for testing');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedSampleData().then(() => process.exit(0));