import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const client = postgres(env.DATABASE_URL!, {
	max: 5,              // limit pool size for low-memory environments (default is 10)
	idle_timeout: 30,    // close idle connections after 30s
	connect_timeout: 10  // fail fast on connection issues
});
export const db = drizzle(client, { schema });
