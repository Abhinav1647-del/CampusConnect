import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not set');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // --- Users ---
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const studentPassword = await bcrypt.hash('Student@123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@iiitn.ac.in' },
    update: {},
    create: {
      email: 'admin@iiitn.ac.in',
      name: 'Campus Admin',
      rollNumber: null,
      passwordHash: adminPassword,
      role: 'APP_ADMIN',
    },
  });

  const messAdmin = await prisma.user.upsert({
    where: { email: 'mess.admin@iiitn.ac.in' },
    update: {},
    create: {
      email: 'mess.admin@iiitn.ac.in',
      name: 'Mess Administrator',
      passwordHash: adminPassword,
      role: 'MESS_ADMIN',
    },
  });

  const moderator = await prisma.user.upsert({
    where: { email: 'moderator@iiitn.ac.in' },
    update: {},
    create: {
      email: 'moderator@iiitn.ac.in',
      name: 'Cart Moderator',
      passwordHash: adminPassword,
      role: 'CAMPUSCART_MODERATOR',
    },
  });

  const student1 = await prisma.user.upsert({
    where: { email: 'bt21cse001@iiitn.ac.in' },
    update: {},
    create: {
      email: 'bt21cse001@iiitn.ac.in',
      name: 'Arjun Sharma',
      rollNumber: 'BT21CSE001',
      passwordHash: studentPassword,
      role: 'STUDENT',
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'bt21cse002@iiitn.ac.in' },
    update: {},
    create: {
      email: 'bt21cse002@iiitn.ac.in',
      name: 'Priya Patel',
      rollNumber: 'BT21CSE002',
      passwordHash: studentPassword,
      role: 'STUDENT',
    },
  });

  const clubLead = await prisma.user.upsert({
    where: { email: 'bt21cse003@iiitn.ac.in' },
    update: {},
    create: {
      email: 'bt21cse003@iiitn.ac.in',
      name: 'Rohan Mehta',
      rollNumber: 'BT21CSE003',
      passwordHash: studentPassword,
      role: 'CLUB_LEAD',
    },
  });

  console.log('✅ Users seeded');

  // --- Mess ---
  const mess = await prisma.mess.upsert({
    where: { id: 'mess-main' },
    update: {},
    create: {
      id: 'mess-main',
      name: 'Main Mess',
      location: 'Block A, Ground Floor',
    },
  });

  // --- Menu Items ---
  const menuItems = await Promise.all([
    prisma.menuItem.upsert({ where: { name: 'Poha' }, update: {}, create: { name: 'Poha', description: 'Flattened rice with vegetables', isVeg: true } }),
    prisma.menuItem.upsert({ where: { name: 'Idli' }, update: {}, create: { name: 'Idli', description: 'Steamed rice cakes', isVeg: true } }),
    prisma.menuItem.upsert({ where: { name: 'Dal Fry' }, update: {}, create: { name: 'Dal Fry', description: 'Yellow lentils with spices', isVeg: true } }),
    prisma.menuItem.upsert({ where: { name: 'Rice' }, update: {}, create: { name: 'Rice', description: 'Steamed basmati rice', isVeg: true } }),
    prisma.menuItem.upsert({ where: { name: 'Roti' }, update: {}, create: { name: 'Roti', description: 'Whole wheat flatbread', isVeg: true } }),
    prisma.menuItem.upsert({ where: { name: 'Sambar' }, update: {}, create: { name: 'Sambar', description: 'Lentil-based vegetable stew', isVeg: true } }),
    prisma.menuItem.upsert({ where: { name: 'Paneer Butter Masala' }, update: {}, create: { name: 'Paneer Butter Masala', description: 'Cottage cheese in tomato gravy', isVeg: true } }),
    prisma.menuItem.upsert({ where: { name: 'Tea' }, update: {}, create: { name: 'Tea', description: 'Masala chai', isVeg: true } }),
    prisma.menuItem.upsert({ where: { name: 'Biscuits' }, update: {}, create: { name: 'Biscuits', description: 'Assorted biscuits', isVeg: true } }),
    prisma.menuItem.upsert({ where: { name: 'Khichdi' }, update: {}, create: { name: 'Khichdi', description: 'Rice and lentils porridge', isVeg: true } }),
  ]);

  console.log('✅ Menu items seeded');

  // --- Today's Meal ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const breakfast = await prisma.meal.upsert({
    where: { messId_date_period: { messId: mess.id, date: today, period: 'BREAKFAST' } },
    update: {},
    create: {
      messId: mess.id,
      date: today,
      period: 'BREAKFAST',
      isPublished: true,
      mealItems: {
        create: [
          { menuItemId: menuItems[0].id },
          { menuItemId: menuItems[1].id },
          { menuItemId: menuItems[7].id },
        ],
      },
    },
  });

  console.log('✅ Meals seeded');

  // --- Clubs (Tantra — IIIT Nagpur) ---
  const clubsData = [
    { name: 'Eklavya',      description: "Eklavya is the official sports club of IIIT Nagpur, organising cricket, football, basketball, badminton, table tennis, athletics and inter-college tournaments.", category: 'Sports' },
    { name: 'Dimensions',   description: 'Dimensions is the game development club of IIIT Nagpur, creating interactive games, virtual worlds, and game design experiences.', category: 'Technical' },
    { name: 'Strokes',      description: "Strokes is IIIT Nagpur's fine arts and UI/UX design club, encouraging creativity through canvas, sketching, digital art, and user experience design.", category: 'Cultural' },
    { name: 'Orator',       description: 'Orator trains students in public speaking, debating and oratory, competing at inter-college and national events.', category: 'Cultural' },
    { name: 'Estoria',      description: "Estoria is IIIT Nagpur's literary club, celebrating creative writing, poetry, storytelling and book discussions.", category: 'Cultural' },
    { name: 'Crescendo',    description: 'Crescendo is the music club of IIIT Nagpur, bringing together musicians, vocalists and performers for jam sessions and fests.', category: 'Cultural' },
    { name: 'CRISPR',       description: 'CRISPR is the Central Research Initiative and Students Public Relations platform of IIIT Nagpur, connecting students with cutting-edge research opportunities, innovation, and campus outreach.', category: 'Technical' },
    { name: 'D-Taraxia',    description: 'D-Taraxia is the dance club of IIIT Nagpur, embracing all dance forms from classical to contemporary and western styles.', category: 'Cultural' },
    { name: 'Dot Slash',    description: 'Dot Slash is the competitive programming club of IIIT Nagpur, focused on problem solving, coding contests and hackathons.', category: 'Technical' },
    { name: 'Iotics',       description: "Iotics is IIIT Nagpur's IoT and embedded systems club, building smart devices, automation projects and hardware prototypes.", category: 'Technical' },
    { name: 'Elevate',      description: 'Elevate is the web development club of IIIT Nagpur, dedicated to building modern web applications, full-stack technologies, and digital products.', category: 'Technical' },
    { name: 'Probe',        description: 'Probe is the photography and visual media club of IIIT Nagpur, capturing campus life, events, photowalks and visual storytelling.', category: 'Cultural' },
    { name: 'Synergy',      description: 'Synergy is the gaming and esports community of IIIT Nagpur, hosting competitive tournaments in BGMI, Valorant, FIFA, and LAN gaming events.', category: 'Sports' },
  ];

  // Deactivate old demo clubs and rename Dot and Slash
  for (const oldName of ['Robotics Club', 'Coding Club', 'Cultural Club']) {
    await prisma.club.updateMany({ where: { name: oldName }, data: { isActive: false } });
  }
  await prisma.club.updateMany({ where: { name: 'Dot and Slash' }, data: { name: 'Dot Slash' } });

  // Upsert all 13 Tantra clubs
  for (const c of clubsData) {
    const club = await prisma.club.upsert({
      where: { name: c.name },
      update: { description: c.description, category: c.category, isActive: true },
      create: { name: c.name, description: c.description, category: c.category, isActive: true },
    });
    console.log(`  ✔ ${club.name}`);
  }

  console.log('✅ Clubs seeded');

  // --- Events (seed sample events under Dot Slash and CRISPR) ---
  const dotSlash = (await prisma.club.findUnique({ where: { name: 'Dot Slash' } })) || (await prisma.club.findUnique({ where: { name: 'Dot and Slash' } }));
  if (dotSlash) {
    await prisma.event.create({
      data: {
        clubId: dotSlash.id,
        title: 'Coding Contest — Round 1',
        description: 'Inter-college competitive programming contest hosted by Dot Slash.',
        venue: 'Lab Complex, IIIT Nagpur',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        capacity: 60,
        enableWaitlist: true,
      },
    });
  }

  const crispr = await prisma.club.findUnique({ where: { name: 'CRISPR' } });
  if (crispr) {
    await prisma.event.create({
      data: {
        clubId: crispr.id,
        title: 'DemoDays(Final Day)',
        description: 'CRISPR presents DemoDays(Final Day)! An exclusive showcase of cutting-edge tech innovations, student startup prototypes, biotech experiments, and project demonstrations.',
        venue: 'Seminar Hall',
        startTime: new Date('2026-10-30T05:30:00.000Z'),
        endTime: new Date('2026-10-30T09:30:00.000Z'),
        registrationDeadline: new Date('2026-10-29T18:29:00.000Z'),
        capacity: 150,
        enableWaitlist: false,
      },
    });

    await prisma.announcement.create({
      data: {
        clubId: crispr.id,
        authorId: clubLead.id,
        title: 'E-Summit 2027 Coming This January! 🚀',
        content: 'We are thrilled to announce that the flagship E-Summit is officially happening this January! Grand preparations have kicked off with exciting speaker sessions, startup pitches, hackathons, and networking opportunities. Stay tuned for dates and registration details!',
      },
    });
  }

  console.log('✅ Events & Announcements seeded');

  // --- CampusCart: clean slate (no pre-seeded dummy listings) ---
  console.log('✅ Listings ready');

  // --- Mess Notice ---
  await prisma.messNotice.create({
    data: {
      messId: mess.id,
      authorId: messAdmin.id,
      title: 'Special Menu on Independence Day',
      content: 'A special dinner will be served on Independence Day. Biryani and sweets included!',
      publishedAt: new Date(),
    },
  });

  console.log('✅ Notices seeded');

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Dev Accounts:');
  console.log('  APP_ADMIN:              admin@iiitn.ac.in          / Admin@123456');
  console.log('  MESS_ADMIN:             mess.admin@iiitn.ac.in     / Admin@123456');
  console.log('  CAMPUSCART_MODERATOR:   moderator@iiitn.ac.in      / Admin@123456');
  console.log('  CLUB_LEAD:              bt21cse003@iiitn.ac.in     / Student@123456');
  console.log('  STUDENT:                bt21cse001@iiitn.ac.in     / Student@123456');
  console.log('  STUDENT:                bt21cse002@iiitn.ac.in     / Student@123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
