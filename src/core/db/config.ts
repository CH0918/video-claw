import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

import { defineConfig } from 'drizzle-kit';

import { envConfigs } from '@/config';

function ensureLocalSqliteDir(databaseUrl: string) {
  if (!databaseUrl.startsWith('file:')) return;

  const filePath = databaseUrl.slice('file:'.length);
  if (!filePath || filePath === ':memory:') return;

  const absoluteFilePath = isAbsolute(filePath)
    ? filePath
    : resolve(process.cwd(), filePath);
  const parentDir = dirname(absoluteFilePath);

  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }
}

ensureLocalSqliteDir(envConfigs.database_url ?? '');

// get db credentials
const dbCredentials: { url: string; authToken?: string } = {
  url: envConfigs.database_url ?? '',
};
if (envConfigs.database_auth_token) {
  dbCredentials.authToken = envConfigs.database_auth_token;
}

// D1 uses sqlite dialect for drizzle-kit
const dialect = envConfigs.database_provider === 'd1'
  ? 'sqlite'
  : envConfigs.database_provider;

// define config
export default defineConfig({
  out: envConfigs.db_migrations_out,
  schema: envConfigs.db_schema_file,
  dialect: dialect as
    | 'sqlite'
    | 'postgresql'
    | 'mysql'
    | 'turso'
    | 'singlestore'
    | 'gel',
  dbCredentials,
  // Migration journal location (used by drizzle-kit migrate)
  migrations:
    envConfigs.database_provider === 'postgresql'
      ? {
          schema: envConfigs.db_migrations_schema,
          table: envConfigs.db_migrations_table,
        }
      : undefined,
});
