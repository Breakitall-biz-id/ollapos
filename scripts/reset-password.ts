import { db } from '../db';
import { account, user } from '../db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
// Use Better Auth's own hashPassword so the format matches
import { hashPassword } from 'better-auth/crypto';

async function resetPassword() {
    const EMAIL = 'bude@pangkalan.com';
    const NEW_PASSWORD = 'password123';

    try {
        // 1. Find the user
        const userData = await db.select().from(user).where(eq(user.email, EMAIL)).limit(1);
        if (userData.length === 0) {
            console.log('❌ User not found with email:', EMAIL);
            return;
        }
        const userId = userData[0].id;
        console.log('✅ Found user:', userData[0].name, '(' + userData[0].email + ')');

        // 2. Hash the new password using Better Auth's scrypt hasher
        const passwordHash = await hashPassword(NEW_PASSWORD);
        console.log('✅ Password hashed (scrypt format):', passwordHash.substring(0, 40) + '...');

        // 3. Check if account record exists
        const existingAccount = await db.select().from(account).where(eq(account.userId, userId)).limit(1);

        if (existingAccount.length > 0) {
            // Update existing account's password
            await db.update(account)
                .set({ password: passwordHash, updatedAt: new Date() })
                .where(eq(account.id, existingAccount[0].id));
            console.log('✅ Password updated on existing account');
        } else {
            // Create new credential account
            await db.insert(account).values({
                id: nanoid(),
                accountId: userId,
                providerId: 'credential',
                userId: userId,
                password: passwordHash,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            console.log('✅ New credential account created with password');
        }

        console.log('\n📝 Login credentials:');
        console.log('   Email:    ' + EMAIL);
        console.log('   Password: ' + NEW_PASSWORD);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

resetPassword().then(() => process.exit(0));
