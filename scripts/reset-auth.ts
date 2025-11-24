import { db } from '../db';
import { user, account, pangkalan } from '../db';
import { eq } from 'drizzle-orm';

async function resetAuth() {
  try {
    console.log('🔄 Resetting authentication...');

    // Delete account and user records
    await db.delete(account).where(eq(account.userId, '2kjqYYJAQ5I_q-6ti14Ta'));
    await db.delete(user).where(eq(user.id, '2kjqYYJAQ5I_q-6ti14Ta'));

    console.log('✅ Old user deleted');

    // Create new user without password hash
    const newUser = {
      id: '2kjqYYJAQ5I_q-6ti14Ta',
      name: 'Bude Sri',
      email: 'bude@pangkalan.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.insert(user).values(newUser);
    console.log('✅ New user created');

    // Verify pangkalan still exists
    const pangkalanRecord = await db.select().from(pangkalan).where(eq(pangkalan.userId, newUser.id)).limit(1);
    if (pangkalanRecord.length > 0) {
      console.log('✅ Pangkalan record verified');
    }

    console.log('\n📝 Login Instructions:');
    console.log('1. Go to: http://localhost:3000/sign-up');
    console.log('2. Sign up with email: bude@pangkalan.com');
    console.log('3. Set password: password123');
    console.log('4. Then try login with same credentials');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

resetAuth().then(() => process.exit(0));