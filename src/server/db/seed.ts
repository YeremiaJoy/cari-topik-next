import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { config } from 'dotenv'
import ws from 'ws'

config({ path: '.env.local' })
config()

neonConfig.webSocketConstructor = ws

const IDS = {
  planFree: '00000000-0000-4000-8000-000000000001',
  planPro: '00000000-0000-4000-8000-000000000002',
  roleAdmin: '00000000-0000-4000-8000-000000000101',
  roleGuest: '00000000-0000-4000-8000-000000000102',
  catPasangan: '00000000-0000-4000-8000-000000000201',
  catTeman: '00000000-0000-4000-8000-000000000202',
  catKeluarga: '00000000-0000-4000-8000-000000000203',
  appConfig: '00000000-0000-4000-8000-000000000301',
}

async function main() {
  const connectionString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')

  const seedPath = path.join(process.cwd(), 'drizzle', 'seed', 'questions.sql')
  const questionSeedSql = (await readFile(seedPath, 'utf8'))
    .replace('insert into public.questions', 'insert into seed_questions')
    .replace(
      '(id, text_id, text_en, category, depth, bias, for_group)',
      '(question_code, text_id, text_en, category, depth, bias, for_group)',
    )
    .replace('on conflict (id)', 'on conflict (question_code)')
  const pool = new Pool({ connectionString })

  try {
    await pool.query('begin')
    await pool.query(`
      insert into plan (id, name, benefit_summary, price, price_after_discount, is_active) values
        ($1, 'free', '{"id":"Gratis","en":"Free plan"}'::jsonb, 0, 0, true),
        ($2, 'pro', '{"id":"Mode grup, kartu lebih banyak, dan dukungan offline","en":"Group mode, more cards, and offline support"}'::jsonb, 50000, 19000, true)
      on conflict (name) do update set
        benefit_summary = excluded.benefit_summary,
        price = excluded.price,
        price_after_discount = excluded.price_after_discount,
        is_active = excluded.is_active,
        updated_at = now(),
        deleted_at = null;
    `, [IDS.planFree, IDS.planPro])
    await pool.query(`
      insert into plan_benefit (
        plan_id,
        max_room,
        mode,
        question_per_session,
        personalized_deck,
        offline_support
      ) values
        ($1, 1, 'berdua', 5, false, false),
        ($2, 999999, 'berdua + grup', 999999, true, true)
      on conflict (plan_id) do update set
        max_room = excluded.max_room,
        mode = excluded.mode,
        question_per_session = excluded.question_per_session,
        personalized_deck = excluded.personalized_deck,
        offline_support = excluded.offline_support,
        updated_at = now(),
        deleted_at = null;
    `, [IDS.planFree, IDS.planPro])
    await pool.query(`
      insert into role (id, name, description) values
        ($1, 'admin', 'Administrator'),
        ($2, 'guest', 'Default user')
      on conflict (name) do update set
        description = excluded.description,
        updated_at = now(),
        deleted_at = null;
    `, [IDS.roleAdmin, IDS.roleGuest])
    await pool.query(`
      insert into question_category (id, name, is_active) values
        ($1, 'pasangan', true),
        ($2, 'teman', true),
        ($3, 'keluarga', true)
      on conflict (name) do update set
        is_active = excluded.is_active,
        updated_at = now(),
        deleted_at = null;
    `, [IDS.catPasangan, IDS.catTeman, IDS.catKeluarga])
    await pool.query('insert into app_config (id) values ($1) on conflict (id) do nothing', [IDS.appConfig])
    await pool.query('insert into announcements default values on conflict (id) do nothing')
    await pool.query(`
      create temp table seed_questions (
        question_code varchar(64) primary key,
        text_id text not null,
        text_en text not null,
        category text not null,
        depth question_depth not null,
        bias question_bias not null,
        for_group boolean not null default false
      ) on commit drop;
    `)
    await pool.query(questionSeedSql)
    await pool.query(`
      insert into questions (question_code, text_id, text_en, category_id, depth, bias, for_group)
      select
        sq.question_code,
        sq.text_id,
        sq.text_en,
        qc.id,
        sq.depth,
        sq.bias,
        sq.for_group
      from seed_questions sq
      join question_category qc on qc.name = sq.category
      on conflict (question_code) do update set
        text_id = excluded.text_id,
        text_en = excluded.text_en,
        category_id = excluded.category_id,
        depth = excluded.depth,
        bias = excluded.bias,
        for_group = excluded.for_group;
    `)
    await pool.query('commit')
    console.log('Seed completed')
  } catch (error) {
    await pool.query('rollback').catch(() => undefined)
    throw error
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Seed failed')
  console.error(error)
  process.exit(1)
})
