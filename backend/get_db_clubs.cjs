const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query('SELECT id, name, category, description FROM "Club" ORDER BY name ASC');
  console.log('DB Clubs:', JSON.stringify(res.rows, null, 2));
}

main().catch(console.error).finally(() => pool.end());
