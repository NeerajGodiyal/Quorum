import { execSync, spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

console.log("🚀 Starting Overclock development servers...\n");

// Run database migrations first
console.log("📦 Running database migrations...");
try {
  execSync("pnpm db:generate", { cwd: root, stdio: "inherit" });
  console.log("✅ Migrations complete\n");
} catch {
  console.log("⚠️  Migration skipped (may already be up to date)\n");
}

// Start Next.js dev server
const web = spawn("pnpm", ["--filter", "@oc/web", "dev"], {
  cwd: root,
  stdio: "pipe",
  shell: true,
});

web.stdout?.on("data", (data: Buffer) => {
  const lines = data.toString().split("\n").filter(Boolean);
  for (const line of lines) {
    console.log(`[web] ${line}`);
  }
});

web.stderr?.on("data", (data: Buffer) => {
  const lines = data.toString().split("\n").filter(Boolean);
  for (const line of lines) {
    console.log(`[web] ${line}`);
  }
});

// Start Socket.IO server
const socketServer = spawn("pnpm", ["--filter", "@oc/socket-server", "dev"], {
  cwd: root,
  stdio: "pipe",
  shell: true,
});

socketServer.stdout?.on("data", (data: Buffer) => {
  const lines = data.toString().split("\n").filter(Boolean);
  for (const line of lines) {
    console.log(`[socket] ${line}`);
  }
});

socketServer.stderr?.on("data", (data: Buffer) => {
  const lines = data.toString().split("\n").filter(Boolean);
  for (const line of lines) {
    console.log(`[socket] ${line}`);
  }
});

// Handle process termination
const cleanup = () => {
  web.kill();
  socketServer.kill();
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
