import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as authSchema from './schema/auth';
import * as posSchema from './schema/pos';

export const db = drizzle(process.env.DATABASE_URL!, {
    schema: { ...authSchema, ...posSchema }
});

// Export all schemas
export * from './schema/auth';
export * from './schema/pos';