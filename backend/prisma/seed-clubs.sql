-- ============================================================
-- Tantra Clubs Seed Script — IIIT Nagpur CampusConnect
-- Run this directly on Supabase SQL Editor or via psql
-- Safe to re-run: uses INSERT ... ON CONFLICT DO UPDATE
-- ============================================================

-- Step 1: Deactivate old demo clubs & migrate names
UPDATE "Club" SET "isActive" = false
WHERE "name" IN ('Robotics Club', 'Coding Club', 'Cultural Club');

UPDATE "Club" SET "name" = 'Dot Slash'
WHERE "name" = 'Dot and Slash';

-- Step 2: Upsert all 13 Tantra clubs
INSERT INTO "Club" ("id", "name", "description", "category", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Eklavya',       'Eklavya is the official sports club of IIIT Nagpur, organising cricket, football, basketball, badminton, table tennis, athletics and inter-college tournaments.',             'Sports',    true, NOW(), NOW()),
  (gen_random_uuid(), 'Dimensions',    'Dimensions is the game development club of IIIT Nagpur, creating interactive games, virtual worlds, and game design experiences.',                                                  'Technical', true, NOW(), NOW()),
  (gen_random_uuid(), 'Strokes',       'Strokes is IIIT Nagpur''s fine arts and UI/UX design club, encouraging creativity through canvas, sketching, digital art, and user experience design.',                              'Cultural',  true, NOW(), NOW()),
  (gen_random_uuid(), 'Orator',        'Orator trains students in public speaking, debating and oratory, competing at inter-college and national events.',                                                                   'Cultural',  true, NOW(), NOW()),
  (gen_random_uuid(), 'Estoria',       'Estoria is IIIT Nagpur''s literary club, celebrating creative writing, poetry, storytelling and book discussions.',                                                                 'Cultural',  true, NOW(), NOW()),
  (gen_random_uuid(), 'Crescendo',     'Crescendo is the music club of IIIT Nagpur, bringing together musicians, vocalists and performers for jam sessions and fests.',                                                      'Cultural',  true, NOW(), NOW()),
  (gen_random_uuid(), 'CRISPR',        'CRISPR is the Central Research Initiative and Students Public Relations platform of IIIT Nagpur, connecting students with cutting-edge research opportunities, innovation, and campus outreach.', 'Technical', true, NOW(), NOW()),
  (gen_random_uuid(), 'D-Taraxia',     'D-Taraxia is the dance club of IIIT Nagpur, embracing all dance forms from classical to contemporary and western styles.',                                                          'Cultural',  true, NOW(), NOW()),
  (gen_random_uuid(), 'Dot Slash',     'Dot Slash is the competitive programming club of IIIT Nagpur, focused on problem solving, coding contests and hackathons.',                                                          'Technical', true, NOW(), NOW()),
  (gen_random_uuid(), 'Iotics',        'Iotics is IIIT Nagpur''s IoT and embedded systems club, building smart devices, automation projects and hardware prototypes.',                                                       'Technical', true, NOW(), NOW()),
  (gen_random_uuid(), 'Elevate',       'Elevate is the web development club of IIIT Nagpur, dedicated to building modern web applications, full-stack technologies, and digital products.',                                  'Technical', true, NOW(), NOW()),
  (gen_random_uuid(), 'Probe',         'Probe is the photography and visual media club of IIIT Nagpur, capturing campus life, events, photowalks and visual storytelling.',                                                  'Cultural',  true, NOW(), NOW()),
  (gen_random_uuid(), 'Synergy',       'Synergy is the gaming and esports community of IIIT Nagpur, hosting competitive tournaments in BGMI, Valorant, FIFA, and LAN gaming events.',                                       'Sports',    true, NOW(), NOW())
ON CONFLICT ("name") DO UPDATE
  SET
    "description" = EXCLUDED."description",
    "category"    = EXCLUDED."category",
    "isActive"    = true,
    "updatedAt"   = NOW();

-- Step 3: Verify
SELECT "name", "category", "isActive", "createdAt"
FROM "Club"
ORDER BY "isActive" DESC, "name" ASC;
