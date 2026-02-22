import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as authSchema from './schema/auth';
import * as posSchema from './schema/pos';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export const db = drizzle(pool, {
    schema: { ...authSchema, ...posSchema }
});

// Export all schemas
export * from './schema/auth';
export * from './schema/pos';