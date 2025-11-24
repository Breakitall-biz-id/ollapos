import { db } from '../db';
import { account, user } from '../db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function checkPassword() {
  try {
    // Get user and account
    const userData = await db.select().from(user).where(eq(user.email, 'bude@pangkalan.com')).limit(1);
    const accountData = await db.select().from(account).where(eq(account.userId, userData[0].id)).limit(1);

    console.log('User:', userData[0]);
    console.log('Account:', accountData[0]);

    if (accountData[0] && accountData[0].password) {
      console.log('Password hash exists:', accountData[0].password?.length, 'characters');

      // Test password verification
      const isValid = await bcrypt.compare('password123', accountData[0].password!);
      console.log('Password verification:', isValid);

      if (!isValid) {
        // Create new hash
        const newHash = await bcrypt.hash('password123', 10);
        console.log('New hash:', newHash);

        // Update account
        await db.update(account)
          .set({ password: newHash })
          .where(eq(account.id, accountData[0].id));

        console.log('Password hash updated');
      }
    } else {
      console.log('No password hash found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPassword().then(() => process.exit(0));