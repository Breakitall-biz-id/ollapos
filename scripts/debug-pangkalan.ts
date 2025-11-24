import { db } from '../db';
import { user, pangkalan } from '../db';
import { eq } from 'drizzle-orm';

async function debugPangkalan() {
  try {
    // Get user
    const userData = await db.select().from(user).where(eq(user.email, 'bude@pangkalan.com')).limit(1);
    console.log('User ID:', userData[0].id);

    if (userData.length > 0) {
      // Check pangkalan records
      const allPangkalan = await db.select().from(pangkalan);
      console.log('All pangkalan records:', allPangkalan);

      // Check specific pangkalan for this user
      const pangkalanData = await db.select().from(pangkalan).where(eq(pangkalan.userId, userData[0].id)).limit(1);

      if (pangkalanData.length === 0) {
        console.log('❌ No pangkalan found for user ID:', userData[0].id);
        console.log('Creating pangkalan record...');

        // Create pangkalan record
        const newPangkalan = {
          id: 'pangkalan-' + userData[0].id,
          userId: userData[0].id,
          name: 'Pangkalan Bude Sri',
          address: 'Jl. Merdeka No. 123, Jakarta',
          phone: '0812-3456-7890',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.insert(pangkalan).values(newPangkalan);
        console.log('✅ Pangkalan record created:', newPangkalan.id);
      } else {
        console.log('✅ Pangkalan found:', pangkalanData[0]);
      }
    } else {
      console.log('❌ No user found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugPangkalan().then(() => process.exit(0));