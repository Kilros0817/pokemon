import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_URL = "https://gaubkhkbxcxfbeocjdpl.supabase.co";
const SUPABASE_KEY = "sb_publishable_kbmi34XUG_K-CyMAVE24KA_ilaKGTtl";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const db = JSON.parse(fs.readFileSync("./db.json", "utf8"));

const clean = (v) => (v === undefined ? null : v);

async function insert(table, rows) {
  if (!rows?.length) return;

  const { error } = await supabase.from(table).upsert(rows, {
    onConflict: "id",
  });

  if (error) {
    console.error(`❌ ${table} failed:`, error);
    process.exit(1);
  }

  console.log(`✅ ${table}: ${rows.length} rows seeded`);
}

async function seed() {
  const trainers = db.trainers.map((t) => ({
    id: String(t.id),
    email: t.email,
    password: t.password,
    firstName: t.firstName,
    lastName: t.lastName,
    createdAt: t.createdAt,
    lastLogin: t.lastLogin,
    badge_count: t.badge_count ?? 0,
    region: clean(t.region),
    avatar_url: clean(t.avatar_url),
    rank: clean(t.rank),
  }));

  const teams = db.teams.map((t) => ({
    id: String(t.id),
    trainer_id: String(t.trainer_id),
    name: t.name,
    pokemon_slots: t.pokemon_slots ?? [],
    created_at: t.created_at,
    competitive_mode: t.competitive_mode ?? false,
    tier: clean(t.tier),
  }));

  const battles = db.battles.map((b) => ({
    id: String(b.id),
    trainer_id: String(b.trainer_id),
    opponent_name: b.opponent_name,
    team_id: String(b.team_id),
    result: b.result,
    date: b.date,
    score_trainer: b.score_trainer ?? 0,
    score_opponent: b.score_opponent ?? 0,
  }));

  const battleLogs = db.battle_log.map((l) => ({
    id: String(l.id),
    battle_id: String(l.battle_id),
    timestamp: l.timestamp,
    message: l.message,
    severity: l.severity === "warning" ? "info" : l.severity,
  }));

  await insert("trainers", trainers);
  await insert("teams", teams);
  await insert("battles", battles);
  await insert("battle_log", battleLogs);

  console.log("🎉 Seed completed");
}

seed();