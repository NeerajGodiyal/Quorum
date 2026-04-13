import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as schema from "../packages/db/src/schema/index.js";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, "../packages/db/data/sqlite.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  trustedOrigins: ["http://localhost:3000"],
});

const users = [
  { name: "SMCIO", email: "smcio@overclock.one" },
  { name: "7Layer", email: "7layer@overclock.one" },
  { name: "DubbleOSix", email: "dubbleosix@overclock.one" },
  { name: "Rupansh", email: "rupansh@overclock.one" },
  { name: "Koro", email: "koro@overclock.one" },
];

async function run() {
  for (const u of users) {
    try {
      await auth.api.signUpEmail({ body: { name: u.name, email: u.email, password: "admin123!" } });
      sqlite.prepare("UPDATE user SET role = 'admin' WHERE email = ?").run(u.email);
      console.log("✅ " + u.name + " (" + u.email + ") — admin");
    } catch (e: any) {
      if (e.message?.includes("UNIQUE")) {
        sqlite.prepare("UPDATE user SET role = 'admin' WHERE email = ?").run(u.email);
        console.log("⚠️  " + u.email + " already exists, set to admin");
      } else {
        console.error("❌ " + u.email + ":", e.message);
      }
    }
  }
  // Ensure all overclock accounts are admin
  sqlite.prepare("UPDATE user SET role = 'admin' WHERE email LIKE '%@overclock.one'").run();

  console.log("\n🎉 All accounts ready!\n");
  console.log("Password for all: admin123!\n");
  users.forEach(u => console.log("  " + u.email));
  sqlite.close();
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
