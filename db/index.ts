import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as authSchema from './schema/auth';
import * as posSchema from './schema/pos';

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, {
    schema: { ...authSchema, ...posSchema }
});

// Export all schemas
export * from './schema/auth';
export * from './schema/pos';