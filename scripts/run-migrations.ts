/**
 * Run Supabase SQL Migrations
 *
 * Executes SQL files from sql/ directory in numeric order.
 * Requires: DATABASE_URL in .env.local (Supabase: Project Settings > Database > Connection string)
 *
 * Usage:
 *   npx tsx scripts/run-migrations.ts
 *   npx tsx scripts/run-migrations.ts --dry-run
 *
 * Or with npm:
 *   npm run migrate
 */

import { readFileSync, readdirSync } from "fs"
import { join } from "path"

async function loadEnv() {
  try {
    const envPath = join(process.cwd(), ".env.local")
    const content = readFileSync(envPath, "utf-8")
    for (const line of content.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) {
        const key = m[1].trim()
        const val = m[2].trim().replace(/^["']|["']$/g, "")
        if (!process.env[key]) process.env[key] = val
      }
    }
  } catch {
    // .env.local might not exist
  }
}

async function main() {
  await loadEnv()

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error(
      "❌ DATABASE_URL is required. Set it in .env.local\n" +
        "   Supabase: Project Settings > Database > Connection string (URI)"
    )
    process.exit(1)
  }

  const dryRun = process.argv.includes("--dry-run")
  if (dryRun) {
    console.log("🔍 Dry run: listing migrations to execute\n")
  }

  // Collect NN_*.sql files and sort by number
  const sqlDir = join(process.cwd(), "sql")
  const files = readdirSync(sqlDir)
    .filter((f) => /^\d{2,}_[\w-]+\.sql$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.split("_")[0], 10)
      const nb = parseInt(b.split("_")[0], 10)
      return na - nb
    })

  if (files.length === 0) {
    console.log("No migration files found in sql/")
    return
  }

  // Run specific migrations (safe, idempotent - ADD COLUMN IF NOT EXISTS)
  // Add more as needed. Use --all to run all numbered migrations.
  const DEFAULT_MIGRATIONS = [
    "26_add_streams_has_drops.sql",
    "27_add_games_release_date.sql",
    "28_create_games_with_drops_view.sql",
    "29_create_hidden_gems_games_view.sql",
    "30_create_new_releases_games_view.sql",
    "36_streamer_game_logs_and_game_top_streamers.sql",
    "37_game_top_streamers_public_read.sql",
    "38_streamer_profile_image_urls.sql",
    "39_fetch_game_ids_for_top_streamer_rpc.sql",
    "40_fetch_game_ids_recent_only.sql",
    "41_daily_game_stats_public_read.sql",
  ]
  const useAll = process.argv.includes("--all")
  const toRun = useAll
    ? files
    : DEFAULT_MIGRATIONS.filter((f) => files.includes(f))

  console.log("Migrations to run:", toRun.join(", "))
  console.log()

  if (dryRun) {
    for (const f of toRun) {
      const sql = readFileSync(join(sqlDir, f), "utf-8")
      console.log(`--- ${f} ---`)
      console.log(sql.slice(0, 300) + (sql.length > 300 ? "..." : ""))
      console.log()
    }
    console.log("Run without --dry-run to execute.")
    return
  }

  let client: any
  try {
    const { default: pg } = await import("pg")
    client = new pg.Client({ connectionString: databaseUrl })
    await client.connect()
  } catch (err) {
    console.error(
      "❌ Failed to connect. Install pg: npm install -D pg @types/pg\n",
      err
    )
    process.exit(1)
  }

  try {
    for (const file of toRun) {
      const filePath = join(sqlDir, file)
      const sql = readFileSync(filePath, "utf-8")
      try {
        await client.query(sql)
        console.log(`  ✅ ${file}`)
      } catch (e: any) {
        // Skip "already exists" for idempotent migrations (ADD COLUMN IF NOT EXISTS, etc.)
        if (
          e.message?.includes("already exists") ||
          e.message?.includes("duplicate key")
        ) {
          console.log(`  ⏭️  ${file} (already applied)`)
        } else {
          throw e
        }
      }
    }
    console.log("\n✅ Migrations completed.")
  } catch (err) {
    console.error("\n❌ Migration failed:", err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
