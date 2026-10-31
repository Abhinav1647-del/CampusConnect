import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set in .env');
  process.exit(1);
}

async function run() {
  const url = new URL(connectionString);
  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port || '5432', 10),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1) || 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');

    const sqlPath = path.join(process.cwd(), 'prisma', 'init.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    if (sql.charCodeAt(0) === 0xFEFF) {
      sql = sql.slice(1);
    }

    console.log('🚀 Executing schema initialization SQL...');
    await client.query(sql);
    console.log('🎉 Schema created successfully in Supabase!');
  } catch (err) {
    console.error('❌ Error executing SQL:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
