import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env['DATABASE_URL'] || 'postgresql://postgres.gyxhjzababmotnrjqbvy:Abhi2994*%23*%23@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true',
  },
  migrate: {
    adapter: (env: NodeJS.ProcessEnv) => {
      const connectionString = env['DATABASE_URL'] || 'postgresql://postgres.gyxhjzababmotnrjqbvy:Abhi2994*%23*%23@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true';
      return new PrismaPg({ connectionString });
    },
  },
});
