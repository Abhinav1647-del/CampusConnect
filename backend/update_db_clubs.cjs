const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  // 1. Update Dot and Slash -> Dot Slash
  await pool.query(`
    UPDATE "Club"
    SET name = 'Dot Slash',
        description = 'Dot Slash is the competitive programming club of IIIT Nagpur, focused on problem solving, coding contests and hackathons.'
    WHERE name = 'Dot and Slash' OR name = 'Dot Slash'
  `);

  // 2. Update CRISPR
  await pool.query(`
    UPDATE "Club"
    SET description = 'Central research initiative and students public relations platform at IIIT Nagpur.'
    WHERE name = 'CRISPR'
  `);

  // 3. Update Dimensions -> game dev
  await pool.query(`
    UPDATE "Club"
    SET category = 'Technical',
        description = 'Dimensions is the game development club of IIIT Nagpur, empowering students to build immersive games, interactive media, and game engines.'
    WHERE name = 'Dimensions'
  `);

  // 4. Update Elevate -> web dev
  await pool.query(`
    UPDATE "Club"
    SET category = 'Technical',
        description = 'Elevate is the web development club of IIIT Nagpur, focusing on modern web technologies, full-stack development, and open-source software.'
    WHERE name = 'Elevate'
  `);

  // 5. Update Strokes -> fine arts and UI/UX
  await pool.query(`
    UPDATE "Club"
    SET description = 'Strokes is IIIT Nagpur\\'s fine arts and UI/UX club, fostering creativity through visual design, digital interfaces, sketch, and canvas art.'
    WHERE name = 'Strokes' OR name = 'Stokes'
  `);

  // 6. Check Orator lead Rudraksh in users / memberships
  const users = await pool.query(`SELECT id, name, email, phone FROM "User" WHERE name ILIKE '%Rudraksh%'`);
  console.log('Rudraksh users:', users.rows);
  if (users.rows.length > 0) {
    await pool.query(`UPDATE "User" SET phone = '7060109792' WHERE id = $1`, [users.rows[0].id]);
    console.log('Updated user phone in DB');
  }

  const updatedClubs = await pool.query('SELECT id, name, category, description FROM "Club" ORDER BY name ASC');
  console.log('Updated DB Clubs:', JSON.stringify(updatedClubs.rows, null, 2));
}

main().catch(console.error).finally(() => pool.end());
