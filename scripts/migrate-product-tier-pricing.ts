import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Creating product_tier_pricing table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS product_tier_pricing (
        id TEXT PRIMARY KEY,
        pangkalan_id TEXT NOT NULL REFERENCES pangkalan(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
        customer_type_id TEXT NOT NULL REFERENCES customer_type(id) ON DELETE CASCADE,
        discount_type TEXT NOT NULL,
        discount_value NUMERIC(10, 2) NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        CONSTRAINT product_tier_pricing_unique UNIQUE (product_id, customer_type_id, pangkalan_id)
      );
    `);
        console.log('✅ product_tier_pricing table created');

        // Create index
        await client.query(`
      CREATE INDEX IF NOT EXISTS product_tier_pricing_pangkalan_idx ON product_tier_pricing(pangkalan_id);
    `);
        console.log('✅ Index created');

        console.log('Migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
