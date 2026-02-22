import { db } from '../db';
import {
    pangkalan,
    customer,
    product,
    priceRule,
    inventory,
    user,
    account
} from '../db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

async function seed() {
    console.log('🌱 Starting database seeding...');

    try {
        // 1. Create a pangkalan user first (if not exists)
        const existingUser = await db.select().from(user).where(eq(user.email, 'bude@pangkalan.com')).limit(1);

        let pangkalanUser;
        if (existingUser.length === 0) {
            // Hash password using bcrypt
            const password = 'password123'; // Simple password for testing
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            const newUser: any = {
                id: nanoid(),
                name: 'Bude Sri',
                email: 'bude@pangkalan.com',
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await db.insert(user).values(newUser);

            // Create account for Better Auth
            const newAccount = {
                id: nanoid(),
                accountId: newUser.id,
                providerId: 'credential',
                userId: newUser.id,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await db.insert(account).values(newAccount);

            pangkalanUser = newUser;
            console.log('✅ Created pangkalan user with hashed password');
            console.log('   Email: bude@pangkalan.com');
            console.log('   Password: password123');
        } else {
            pangkalanUser = existingUser[0];
            // Check if account exists
            const existingAccount = await db.select()
                .from(account)
                .where(eq(account.userId, pangkalanUser.id))
                .limit(1);

            if (existingAccount.length === 0) {
                // Create account if missing
                const password = 'password123';
                const hashedPassword = await bcrypt.hash(password, 10);

                const newAccount = {
                    id: nanoid(),
                    accountId: pangkalanUser.id,
                    providerId: 'credential',
                    userId: pangkalanUser.id,
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await db.insert(account).values(newAccount);
                console.log('✅ Created missing account for existing user');
                console.log('   Email: bude@pangkalan.com');
                console.log('   Password: password123');
            } else {
                console.log('✅ Pangkalan user and account already exists');
            }
        }

        // 2. Create pangkalan profile
        const pangkalanData = {
            id: nanoid(),
            userId: pangkalanUser.id,
            name: 'Pangkalan Bude Sri',
            address: 'Jl. Merdeka No. 123, Jakarta',
            phone: '0812-3456-7890',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const existingPangkalan = await db.select().from(pangkalan).where(eq(pangkalan.userId, pangkalanUser.id)).limit(1);

        let pangkalanRecord;
        if (existingPangkalan.length === 0) {
            await db.insert(pangkalan).values(pangkalanData);
            pangkalanRecord = pangkalanData;
            console.log('✅ Created pangkalan profile');
        } else {
            pangkalanRecord = existingPangkalan[0];
            console.log('✅ Pangkalan profile already exists');
        }

        // 3. Create global products (LPG)
        const globalProducts = [
            {
                id: nanoid(),
                name: 'Gas LPG 3kg',
                category: 'gas',
                imageUrl: '/images/gas-3kg.jpg',
                isGlobal: true,
                createdAt: new Date()
            },
            {
                id: nanoid(),
                name: 'Gas LPG 5.5kg',
                category: 'gas',
                imageUrl: '/images/gas-5kg.jpg',
                isGlobal: true,
                createdAt: new Date()
            },
            {
                id: nanoid(),
                name: 'Gas LPG 12kg',
                category: 'gas',
                imageUrl: '/images/gas-12kg.jpg',
                isGlobal: true,
                createdAt: new Date()
            }
        ];

        for (const productData of globalProducts) {
            const existing = await db.select().from(product).where(eq(product.name, productData.name)).limit(1);
            if (existing.length === 0) {
                await db.insert(product).values(productData);
            }
        }
        console.log('✅ Created global LPG products');

        // 4. Create local products
        const localProducts = [
            {
                id: nanoid(),
                name: 'Air Galon',
                category: 'water',
                pangkalanId: pangkalanRecord.id,
                imageUrl: '/images/galon.jpg',
                createdAt: new Date()
            },
            {
                id: nanoid(),
                name: 'Beras 5kg',
                category: 'general',
                pangkalanId: pangkalanRecord.id,
                imageUrl: '/images/beras.jpg',
                createdAt: new Date()
            }
        ];

        for (const productData of localProducts) {
            const existing = await db.select().from(product).where(eq(product.name, productData.name)).limit(1);
            if (existing.length === 0) {
                await db.insert(product).values(productData);
            }
        }
        console.log('✅ Created local products');

        // 5. Get all products for price rules and inventory
        const allProducts = await db.select().from(product);

        // 6. Create price rules
        for (const productRecord of allProducts) {
            const existingPriceRule = await db.select()
                .from(priceRule)
                .where(and(eq(priceRule.pangkalanId, pangkalanRecord.id), eq(priceRule.productId, productRecord.id)))
                .limit(1);

            if (existingPriceRule.length === 0) {
                const priceData = {
                    id: nanoid(),
                    pangkalanId: pangkalanRecord.id,
                    productId: productRecord.id,
                    priceRegular: productRecord.category === 'gas' ? 25000 : 15000,
                    priceVip: productRecord.category === 'gas' ? 23000 : 14000,
                    updatedAt: new Date()
                } as any;
                await db.insert(priceRule).values(priceData);
            }
        }
        console.log('✅ Created price rules');

        // 7. Create inventory
        for (const productRecord of allProducts) {
            const existingInventory = await db.select()
                .from(inventory)
                .where(and(eq(inventory.pangkalanId, pangkalanRecord.id), eq(inventory.productId, productRecord.id)))
                .limit(1);

            if (existingInventory.length === 0) {
                const inventoryData = {
                    id: nanoid(),
                    pangkalanId: pangkalanRecord.id,
                    productId: productRecord.id,
                    stockFilled: productRecord.category === 'gas' ? 100 : 50,
                    stockEmpty: productRecord.category === 'gas' ? 50 : 0,
                    updatedAt: new Date()
                };
                await db.insert(inventory).values(inventoryData);
            }
        }
        console.log('✅ Created inventory');

        // 8. Create sample customers
        const customers = [
            {
                id: nanoid(),
                pangkalanId: pangkalanRecord.id,
                name: 'Pak Joko Bakso',
                isVip: true,
                phone: '0813-9876-5432',
                createdAt: new Date()
            } as any,
            {
                id: nanoid(),
                pangkalanId: pangkalanRecord.id,
                name: 'Ibu Sumiati',
                isVip: false,
                phone: '0822-1111-2222',
                createdAt: new Date()
            } as any,
            {
                id: nanoid(),
                pangkalanId: pangkalanRecord.id,
                name: 'Bapak Ahmad',
                isVip: true,
                phone: '0818-5555-6666',
                createdAt: new Date()
            } as any
        ];

        for (const customerData of customers) {
            const existing = await db.select()
                .from(customer)
                .where(and(eq(customer.pangkalanId, pangkalanRecord.id), eq(customer.name, customerData.name)))
                .limit(1);

            if (existing.length === 0) {
                await db.insert(customer).values(customerData);
            }
        }
        console.log('✅ Created sample customers');

        console.log('🎉 Database seeding completed successfully!');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

// Run seed
seed().then(() => process.exit(0));