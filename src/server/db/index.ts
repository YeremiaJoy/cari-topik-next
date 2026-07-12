import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import * as schema from './schema'

neonConfig.webSocketConstructor = ws

function createDb() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')

  const pool = new Pool({ connectionString })
  return drizzle(pool, { schema })
}

type Db = ReturnType<typeof createDb>

declare global {
  // eslint-disable-next-line no-var
  var __cariTopikDb: Db | undefined
}

export function getDb(): Db {
  globalThis.__cariTopikDb ??= createDb()
  return globalThis.__cariTopikDb
}
