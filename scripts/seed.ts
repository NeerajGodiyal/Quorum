import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import * as schema from "../packages/db/src/schema/index.js";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, "../packages/db/data/sqlite.db");

mkdirSync(resolve(__dirname, "../packages/db/data"), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

// Create tables using raw SQL (matching our Drizzle schema)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    email_verified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at INTEGER,
    refresh_token_expires_at INTEGER,
    scope TEXT,
    password TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date INTEGER,
    created_by TEXT NOT NULL REFERENCES user(id),
    assignee_id TEXT REFERENCES user(id),
    project_tag TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES user(id),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    capacity INTEGER,
    metadata TEXT,
    url TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    created_by TEXT NOT NULL REFERENCES user(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resource_allocations (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    start_date INTEGER,
    end_date INTEGER,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS pins (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT,
    description TEXT,
    content TEXT,
    thumbnail TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    color TEXT DEFAULT '#3B82F6',
    created_by TEXT NOT NULL REFERENCES user(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    mode TEXT NOT NULL DEFAULT 'text',
    canvas_data TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL REFERENCES user(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plan_sections (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'general',
    created_by TEXT NOT NULL REFERENCES user(id),
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS channel_members (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    joined_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES user(id),
    content TEXT NOT NULL,
    parent_message_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS message_reactions (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT '📁',
    color TEXT NOT NULL DEFAULT '#14F195',
    starred INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_by TEXT NOT NULL REFERENCES user(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_sections (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'notes',
    content TEXT NOT NULL DEFAULT '',
    canvas_data TEXT NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

console.log("✅ Tables created\n");

// Set up Better Auth for password hashing
const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  trustedOrigins: ["http://localhost:3000"],
});

async function seed() {
  console.log("🌱 Seeding database...\n");

  // Create team accounts
  const teamAccounts = [
    { name: "Koro", email: "koro@overclock.one" },
    { name: "SMCIO", email: "smcio@overclock.one" },
    { name: "7Layer", email: "7layer@overclock.one" },
    { name: "DubbleOSix", email: "dubbleosix@overclock.one" },
    { name: "Rupansh", email: "rupansh@overclock.one" },
  ];

  console.log("Creating team accounts...");
  try {
    const userIds: string[] = [];
    for (const account of teamAccounts) {
      const result = await auth.api.signUpEmail({
        body: { name: account.name, email: account.email, password: "admin123!" },
      });
      const userId = (result as any).user?.id;
      if (userId) {
        sqlite.prepare("UPDATE user SET role = 'admin' WHERE id = ?").run(userId);
        userIds.push(userId);
        console.log(`✅ ${account.name} (${account.email}) — admin`);
      }
    }

    const adminId = userIds[0]; // Koro
    const memberId = userIds[1]; // SMCIO
    if (!adminId) {
      console.log("⚠️  Could not get user IDs, skipping sample data");
      return;
    }

    const now = Date.now();

    // Seed tasks with due dates — Overclock focused
    const day = 86400000;
    const sampleTasks = [
      { id: crypto.randomUUID(), title: "Mithril block verification benchmarks", description: "Run verification benchmarks on latest Mithril build and compare with previous results", status: "in_progress", priority: "high", project_tag: "Mithril", created_by: adminId, assignee_id: adminId, due_date: now + 3 * day, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), title: "Update Agave fork to latest", description: "Merge upstream Anza changes into our Agave fork and resolve conflicts", status: "todo", priority: "medium", project_tag: "Validator", created_by: adminId, assignee_id: memberId, due_date: now + 7 * day, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), title: "Shredcaster performance tuning", description: "Optimize UDP shred broadcasting latency and throughput", status: "in_progress", priority: "high", project_tag: "Infra", created_by: adminId, assignee_id: adminId, due_date: now + 2 * day, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), title: "Server monitoring alerts", description: "Set up alerting for validator downtime, missed slots, and resource usage", status: "todo", priority: "urgent", project_tag: "DevOps", created_by: adminId, assignee_id: memberId, due_date: now + 5 * day, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), title: "Snapshot finder improvements", description: "Add parallel download support and automatic retry logic to snapshot finder", status: "backlog", priority: "medium", project_tag: "Mithril", created_by: memberId || adminId, assignee_id: null, due_date: now + 14 * day, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), title: "Jito MEV integration review", description: "Review and test latest Jito-Solana fork changes for MEV optimization", status: "review", priority: "high", project_tag: "Validator", created_by: memberId || adminId, assignee_id: adminId, due_date: now + 2 * day, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), title: "Commission rate analysis", description: "Analyze competitor validator commissions and optimize our rate for delegator growth", status: "todo", priority: "medium", project_tag: "Strategy", created_by: adminId, assignee_id: memberId, due_date: now + 10 * day, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), title: "Fastcache memory optimization", description: "Profile and reduce memory usage in shared cache layer", status: "done", priority: "medium", project_tag: "Mithril", created_by: adminId, assignee_id: adminId, created_at: now - 2 * day, updated_at: now },
      { id: crypto.randomUUID(), title: "Hetzner server provisioning", description: "Set up new bare-metal nodes for validator cluster expansion", status: "done", priority: "high", project_tag: "Infra", created_by: adminId, assignee_id: adminId, created_at: now - 5 * day, updated_at: now - 1 * day },
      { id: crypto.randomUUID(), title: "Gossip protocol debugging", description: "Investigate intermittent gossip connection drops between cluster nodes", status: "todo", priority: "high", project_tag: "Mithril", created_by: memberId || adminId, assignee_id: memberId, due_date: now + 2 * day, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), title: "Website staking walkthrough update", description: "Update overclock.one staking guide with latest screenshots and flow", status: "backlog", priority: "low", project_tag: "Website", created_by: adminId, assignee_id: null, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), title: "Leader schedule prediction", description: "Implement leader schedule lookahead for optimized block production timing", status: "in_progress", priority: "high", project_tag: "Validator", created_by: adminId, assignee_id: adminId, due_date: now + 1 * day, created_at: now, updated_at: now },
    ];

    for (const task of sampleTasks) {
      sqlite.prepare(`INSERT OR IGNORE INTO tasks (id, title, description, status, priority, project_tag, created_by, assignee_id, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        task.id, task.title, task.description ?? null, task.status, task.priority, task.project_tag, task.created_by, task.assignee_id, task.due_date ?? null, task.created_at, task.updated_at
      );
    }
    console.log(`✅ ${sampleTasks.length} sample tasks created`);

    // Seed channels
    const generalId = crypto.randomUUID();
    const designId = crypto.randomUUID();
    sqlite.prepare(`INSERT OR IGNORE INTO channels (id, name, type, created_by, created_at) VALUES (?, ?, ?, ?, ?)`).run(generalId, "general", "general", adminId, now);
    sqlite.prepare(`INSERT OR IGNORE INTO channels (id, name, type, created_by, created_at) VALUES (?, ?, ?, ?, ?)`).run(designId, "design", "project", adminId, now);
    sqlite.prepare(`INSERT OR IGNORE INTO channels (id, name, type, created_by, created_at) VALUES (?, ?, ?, ?, ?)`).run(crypto.randomUUID(), "engineering", "project", adminId, now);
    console.log("✅ Chat channels created");

    // Seed messages
    const sampleMessages = [
      { channelId: generalId, userId: adminId, content: "Welcome to the Overclock workspace. Let's use this for all team coordination.", ts: now - 6 * day },
      { channelId: generalId, userId: memberId || adminId, content: "Nice setup. I've been tracking Mithril tasks on the board.", ts: now - 6 * day + 300000 },
      { channelId: generalId, userId: adminId, content: "Good. Let's keep high priority items focused on validator performance.", ts: now - 6 * day + 600000 },
      { channelId: generalId, userId: memberId || adminId, content: "The Agave fork needs a merge with upstream. I'll pick that up.", ts: now - 5 * day },
      { channelId: generalId, userId: adminId, content: "Sounds good. Also check the Jito integration — new MEV changes landed.", ts: now - 5 * day + 120000 },
      { channelId: generalId, userId: memberId || adminId, content: "On it. The shredcaster benchmarks are looking solid btw.", ts: now - 4 * day },
      { channelId: designId, userId: adminId, content: "Putting together the Mithril architecture doc. Need input on the gossip layer.", ts: now - 3 * day },
      { channelId: designId, userId: memberId || adminId, content: "The verification pipeline section looks good. I can add the snapshot finder flow.", ts: now - 3 * day + 300000 },
      { channelId: designId, userId: adminId, content: "Let's also document the fastcache integration — that was a key optimization.", ts: now - 2 * day },
      { channelId: designId, userId: memberId || adminId, content: "Will do. I'll add diagrams for the shred reception path too.", ts: now - 1 * day },
    ];

    for (const msg of sampleMessages) {
      sqlite.prepare(`INSERT INTO messages (id, channel_id, user_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
        crypto.randomUUID(), msg.channelId, msg.userId, msg.content, msg.ts, msg.ts
      );
    }
    console.log("✅ Sample messages created");

    // ── ONE comprehensive plan with all 3 modes populated ──
    const planId = crypto.randomUUID();

    // Canvas data — full system architecture with proper node types for visual variety
    const canvasData = JSON.stringify({
      nodes: [
        // ─── OPERATOR LAYER (top) ───
        { id: "operator", type: "layer", position: { x: 420, y: 0 }, data: { label: "Operator", description: "Human interface — phone, terminal, laptop, or dashboard app", nodeType: "layer" } },

        // ─── AI HOST LAYER ───
        { id: "claude-code", type: "component", position: { x: 40, y: 150 }, data: { label: "Claude Code", description: "Interactive AI host — natural language queries, debugging, config changes via terminal", nodeType: "component" } },
        { id: "cursor", type: "component", position: { x: 240, y: 150 }, data: { label: "Cursor / Codex", description: "Alternative AI hosts — any MCP-compatible IDE or tool works", nodeType: "component" } },
        { id: "agent-daemon", type: "service", position: { x: 460, y: 150 }, data: { label: "Agent Daemon", description: "Hermes / PicoClaw — runs on server, autonomous monitoring + on-demand operations", nodeType: "service" } },
        { id: "dashboard-app", type: "component", position: { x: 700, y: 150 }, data: { label: "Dashboard / App", description: "Future web or mobile app — real-time metrics, alerts, trade execution, portfolio view", nodeType: "component" } },

        // ─── CHAT PLATFORMS ───
        { id: "telegram", type: "component", position: { x: 740, y: 290 }, data: { label: "Telegram", description: "On-demand commands: stop/restart node, show logs, swap tokens, check slot", nodeType: "component" } },
        { id: "discord", type: "component", position: { x: 920, y: 290 }, data: { label: "Discord", description: "Team alerts channel — anomaly notifications, health check failures", nodeType: "component" } },

        // ─── MCP PROTOCOL LAYER ───
        { id: "mcp-protocol", type: "api", position: { x: 420, y: 310 }, data: { label: "MCP Protocol", description: "Model Context Protocol — agent-agnostic typed tool interface. stdio or streamable-HTTP transport", nodeType: "api" } },

        // ─── MCP SERVERS ───
        { id: "mithril-mcp", type: "service", position: { x: 160, y: 460 }, data: { label: "mithril-mcp (Rust)", description: "Monitoring server — metrics, logs, RPC queries, state file, process control, bank hash verification, diagnostics, solana checks", nodeType: "service" } },
        { id: "trade-mcp", type: "service", position: { x: 640, y: 460 }, data: { label: "mithril-trade-mcp", description: "Trading server — Jupiter swaps, Jito bundles, wallet management. Uses rig-on-chain-kit internally", nodeType: "service" } },
        { id: "mithril-sim", type: "processor", position: { x: 0, y: 340 }, data: { label: "mithril-sim", description: "Dev simulator — mimics Mithril's external surface for local testing without real node", nodeType: "processor" } },

        // ─── RISK & APPROVAL ───
        { id: "risk-engine", type: "auth", position: { x: 640, y: 570 }, data: { label: "Risk Engine", description: "Position sizing limits, max drawdown circuit breaker, daily trade cap, kill switch", nodeType: "auth" } },
        { id: "approval-gate", type: "auth", position: { x: 380, y: 570 }, data: { label: "Approval Gate", description: "Destructive actions (stop, restart, config write) require user confirmation via Telegram before executing", nodeType: "auth" } },

        // ─── INFRASTRUCTURE LAYER ───
        { id: "mithril-node", type: "database", position: { x: 160, y: 640 }, data: { label: "Mithril Node (Go)", description: "Solana verifying full node — replays every mainnet block, reproduces bank hashes independently", nodeType: "database" } },
        { id: "prometheus", type: "database", position: { x: 0, y: 640 }, data: { label: "Prometheus :9090", description: "Metrics endpoint — slot height, bank hash rate, verification latency, error counts, throughput", nodeType: "database" } },
        { id: "rpc-endpoint", type: "api", position: { x: 160, y: 760 }, data: { label: "JSON-RPC :8899", description: "RPC interface — getSlot, getBlockHeight, getHealth, custom Mithril-specific endpoints", nodeType: "api" } },
        { id: "log-files", type: "database", position: { x: 0, y: 760 }, data: { label: "Log Files + State", description: "Structured log files, state file (JSON), pprof profiling endpoint for Go runtime", nodeType: "database" } },

        // ─── SOLANA NETWORK ───
        { id: "solana-rpc", type: "database", position: { x: 640, y: 680 }, data: { label: "Solana Mainnet RPCs", description: "Helius RPC, public endpoints — for reference slot comparison and trade execution", nodeType: "database" } },
        { id: "jupiter", type: "service", position: { x: 830, y: 580 }, data: { label: "Jupiter DEX", description: "Decentralized exchange aggregator — token swaps, limit orders, DCA", nodeType: "service" } },
        { id: "jito", type: "service", position: { x: 830, y: 680 }, data: { label: "Jito Block Engine", description: "MEV bundles — sandwich protection, tip distribution, bundle submission", nodeType: "service" } },

        // ─── LLM LAYER ───
        { id: "llm-api", type: "processor", position: { x: 700, y: 10 }, data: { label: "LLM API", description: "Model routing: DeepSeek (routine $0.0005/call) → Haiku (triage $0.01) → Sonnet (analysis $0.03) → Opus (incidents $0.10)", nodeType: "processor" } },
      ],
      edges: [
        // Operator → hosts
        { id: "e1", source: "operator", target: "claude-code", animated: true },
        { id: "e2", source: "operator", target: "cursor", animated: true },
        { id: "e3", source: "operator", target: "agent-daemon", animated: true },
        { id: "e4", source: "operator", target: "dashboard-app", animated: true },
        // Agent → LLM
        { id: "e-llm", source: "agent-daemon", target: "llm-api", animated: true },
        // Agent → chat
        { id: "e5", source: "agent-daemon", target: "telegram", animated: true },
        { id: "e6", source: "agent-daemon", target: "discord", animated: true },
        // Hosts → MCP
        { id: "e7", source: "claude-code", target: "mcp-protocol", animated: true },
        { id: "e8", source: "cursor", target: "mcp-protocol", animated: true },
        { id: "e9", source: "agent-daemon", target: "mcp-protocol", animated: true },
        { id: "e10", source: "dashboard-app", target: "mcp-protocol", animated: true },
        // MCP → servers
        { id: "e11", source: "mcp-protocol", target: "mithril-mcp", animated: true },
        { id: "e12", source: "mcp-protocol", target: "trade-mcp", animated: true },
        // Sim
        { id: "e-sim", source: "mithril-mcp", target: "mithril-sim", animated: false },
        // Approval
        { id: "e-approve", source: "mithril-mcp", target: "approval-gate", animated: true },
        // MCP → infra
        { id: "e13", source: "mithril-mcp", target: "mithril-node", animated: true },
        { id: "e14", source: "mithril-mcp", target: "prometheus", animated: true },
        { id: "e15", source: "mithril-node", target: "rpc-endpoint", animated: true },
        { id: "e16", source: "mithril-node", target: "log-files", animated: true },
        { id: "e17", source: "mithril-node", target: "prometheus", animated: true },
        // Trade → risk + network
        { id: "e18", source: "trade-mcp", target: "risk-engine", animated: true },
        { id: "e19", source: "trade-mcp", target: "solana-rpc", animated: true },
        { id: "e20", source: "trade-mcp", target: "jupiter", animated: true },
        { id: "e21", source: "trade-mcp", target: "jito", animated: true },
      ],
    });

    // Diagram — comprehensive process flow with all stages
    const diagramContent = `graph TD
    OP((Operator)) --> HOST[AI Hosts]
    OP --> AGENT[Agent Daemon]
    OP --> APP[Dashboard]

    HOST --> MCP{MCP Protocol}
    AGENT --> MCP
    APP --> MCP

    AGENT --> TG[Telegram]
    AGENT --> LLM[LLM API]

    MCP --> MON[mithril-mcp]
    MCP --> TRADE[trade-mcp]

    MON --> MITH[(Mithril Node)]
    MON --> PROM[(Prometheus)]
    MITH --> RPC[RPC :8899]
    MITH --> LOGS[Logs + State]

    TRADE --> JUP[Jupiter DEX]
    TRADE --> JITO[Jito Bundles]
    TRADE --> RISK{Risk Engine}
    RISK --> KILL[Kill Switch]
    TRADE --> SOL[(Solana RPCs)]

    TG --> CMD{Destructive?}
    CMD -->|Yes| GATE[Approval Gate]
    CMD -->|No| EXEC[Execute]
    GATE --> EXEC

    style OP fill:#14F195,stroke:#14F195,color:#0a0a0a
    style MCP fill:#F59E0B,stroke:#F59E0B,color:#0a0a0a
    style RISK fill:#EF4444,stroke:#EF4444,color:#fff
    style GATE fill:#EF4444,stroke:#EF4444,color:#fff
    style MON fill:#3B82F6,stroke:#3B82F6,color:#fff
    style TRADE fill:#3B82F6,stroke:#3B82F6,color:#fff
    style MITH fill:#22C55E,stroke:#22C55E,color:#0a0a0a
    style PROM fill:#22C55E,stroke:#22C55E,color:#0a0a0a
    style SOL fill:#22C55E,stroke:#22C55E,color:#0a0a0a
    style LLM fill:#8B5CF6,stroke:#8B5CF6,color:#fff
    style HOST fill:#8B5CF6,stroke:#8B5CF6,color:#fff
    style AGENT fill:#EC4899,stroke:#EC4899,color:#fff`;

    sqlite.prepare(`INSERT OR IGNORE INTO plans (id, title, type, description, mode, canvas_data, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      planId, "Mithril MCP — Architecture & Strategy", "architecture", "Full system architecture, 4-stage roadmap, agent comparison, model routing — from the Mithril agent model guide", "canvas", canvasData, "approved", adminId, now - 4 * day, now
    );

    // Document sections — the full guide content
    const planSections = [
      { title: "What We're Building", content: "Mithril is a Solana verifying full node (Go). It replays every mainnet block and reproduces bank hashes independently. This requires tooling to monitor it, operate it, alert on failures, and eventually trade from it.\n\nThe system has four stages:\n\nSTAGE 1 — MCP Server\nBuild typed tools that expose Mithril's metrics, RPC, logs, state, and process control via Model Context Protocol. These tools are the foundation — every later stage builds on them.\n\nSTAGE 2 — Interactive Operation\nConnect MCP server to any AI host (Claude Code, Cursor, Codex, Goose). Operator works through natural language — querying state, debugging issues, modifying config, restarting processes.\n\nSTAGE 3 — Autonomous Agent\nDeploy an agent daemon on the server. Operates in two modes:\n• Automatic — scheduled health checks, anomaly detection, alerts\n• On-demand — operator commands via Telegram/Discord (stop node, restart, show logs, switch RPC, run diagnostics). Destructive actions require confirmation before executing.\n\nSTAGE 4 — Trading & App Layer\nAdd DeFi execution tools (Jupiter, Jito) as a second MCP server. Same agent handles trading commands via Telegram. Risk engine enforces position limits, drawdown caps, and kill switches. Eventually: operator dashboard or mobile app.", order: 0 },
      { title: "System Design", content: "Full Architecture:\n\nOPERATOR (phone, terminal, dashboard)\n  ↓\nAI HOSTS (Claude Code, Cursor, Goose) + AGENT DAEMON (Hermes, PicoClaw)\n  ↓\nMCP PROTOCOL\n  ↓\nmithril-mcp (Monitoring)          mithril-trade-mcp (Trading)\n• metrics                          • Jupiter swaps\n• logs                             • Jito bundles\n• RPC queries                      • risk engine\n• state file                       • wallet management\n• process control                  (uses rig-on-chain-kit)\n• bank hash verification\n• diagnostics\n  ↓                                  ↓\nMithril Node (Go)                 Solana Network\n• Prometheus:9090                  • Jupiter DEX\n• JSON-RPC:8899                    • Jito Bundles\n• Log files, State file            • Helius RPC\n• pprof                            • Mainnet RPCs\n\nDesign Principles:\n• MCP servers are the product — agent-agnostic, host-agnostic\n• One agent handles all autonomous tasks (monitoring + trading)\n• Trading is a separate MCP server, not a separate agent\n• Any MCP-compatible host works for interactive sessions\n• Each stage works independently — no stage depends on a later one", order: 1 },
      { title: "Process Flow", content: "STEP 1 — Build MCP Server\nWrite Rust MCP server with tools for metrics, logs, RPC, state. Build simulator that mimics Mithril's external surface. Test against simulator locally. Repo: crates/mithril-mcp, crates/mithril-sim, crates/shared.\n\nSTEP 2 — Connect to AI Host\nConfigure Claude Code (or any MCP host) via .mcp.json. Operator interacts with Mithril through natural language.\n\nSTEP 3 — Deploy on Server\nBuild release binary. Deploy to production alongside Mithril. SSH tunnel for remote access. Run against real node for 7+ days.\n\nSTEP 4 — Add Autonomous Agent\nDeploy agent daemon. Automatic: health checks every 5 min, anomaly alerts. On-demand via Telegram: stop/restart mithril, show logs, check slot, switch RPC. Approval gate for destructive actions.\n\nSTEP 5 — Add Trading\nBuild second MCP server for DeFi. Jupiter swaps, Jito bundles, wallet management. Risk controls: position limits, drawdown cap, kill switch.\n\nSTEP 6 — App Layer (future)\nSwitch MCP transport from stdio to streamable-HTTP. Build dashboard or mobile app connecting to same MCP tools.", order: 2 },
      { title: "Agent Comparison", content: "Hermes Agent (Python, MIT)\n• Most complete: self-learning, 15+ chat platforms, model routing, multi-instance profiles, Docker\n• Trade-off: ~200MB, requires Python + venv\n\nPicoClaw (Go, MIT)\n• 8MB binary, <10MB RAM, zero dependencies, single binary via scp\n• Trade-off: no self-learning, fewer platforms, newer project\n\nGoose (Rust, Apache 2.0, Linux Foundation)\n• 3000+ MCP integrations, 29K+ stars, model-agnostic (25+ providers)\n• Trade-off: no built-in Telegram/Discord, would need custom alerting\n\nClaude Agent SDK (Python/TS, Anthropic)\n• Deepest MCP integration, first-party support, managed hosting option\n• Trade-off: Anthropic-only, no chat platforms, everything beyond tool calling is DIY\n\nCrewAI (Python, MIT, 45K+ stars)\n• Multi-agent teams with role assignments, large community\n• Trade-off: overkill for single-node monitoring, heavy runtime\n\nMastra (TypeScript, Apache 2.0, YC W25)\n• Built-in RAG, persistent memory, workflow engine\n• Trade-off: Node.js overhead, no built-in chat platforms\n\nThe architecture is designed so agents can be swapped in <1 hour without changing MCP servers or Mithril.", order: 3 },
      { title: "Model Routing & Costs", content: "Every agent needs a paid LLM. Model choice is independent of agent choice.\n\nRouting by task complexity:\n• Health checks (slot, epoch) → DeepSeek V3.2 ($0.14/M input) → ~$0.0005/call\n• Log anomaly triage → Haiku 4.5 ($1/M) → ~$0.01/call\n• Metric trend analysis → Sonnet 4.6 ($3/M) → ~$0.03/call\n• Incident diagnosis → Opus 4.6 ($5/M) → ~$0.10/call\n• Trade execution → Sonnet or GPT-4.1 ($2-3/M) → ~$0.03/call\n\nEstimated monthly cost (5-min health checks, ~10 anomalies, ~2 incidents):\n• DeepSeek for all routine: 8,640 calls × $0.0005 = ~$4/mo\n• Mixed routing (recommended): $6-12/mo\n• Haiku for all routine: 8,640 calls × $0.005 = ~$43/mo\n\nCost optimizations:\n• Anthropic prompt caching: 90% off\n• Batch processing: 50% off\n• DeepSeek cache hit: 90% off\n\nAccess methods: Claude Code subscription (interactive only), Direct API keys (pay per token), OpenRouter (single key for all providers).", order: 4 },
      { title: "Pluggable Agent Design", content: "The MCP server doesn't know or care what agent is calling it. It speaks MCP protocol. That's it.\n\nTo switch agents:\n1. Stop old agent daemon\n2. Install new agent\n3. Point it at the same MCP server config\n4. Start new agent daemon\n\nNothing else changes. MCP server stays. Tools stay. Mithril stays.\n\nWhat each layer owns:\n• Mithril Node — runs the node, exposes metrics/RPC/logs. Knows nothing about MCP or agents.\n• MCP Server — translates Mithril interfaces into typed MCP tools. Validates inputs, sanitizes outputs. Knows nothing about which agent is calling.\n• Agent — calls MCP tools, reasons with LLM, manages chat platforms, schedules checks, approval gates. REPLACEABLE. Only layer that touches LLM API.\n• Chat (Telegram/Discord) — user interface. Agent handles the integration.\n\nIntegration: MCP server reads env vars (MITHRIL_METRICS_URL, MITHRIL_RPC_URL, MITHRIL_LOG_DIR, MITHRIL_STATE_PATH). Agent reads its own API key + Telegram bot token. Adding trading = add another MCP server entry to agent config. Adding dashboard = switch MCP transport from stdio to streamable-HTTP.\n\nEstimated time to swap agents: <1 hour.", order: 5 },
    ];

    // Insert diagram as special __diagram__ section
    sqlite.prepare(`INSERT OR IGNORE INTO plan_sections (id, plan_id, title, content, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      crypto.randomUUID(), planId, "__diagram__", diagramContent, 99, now, now
    );

    for (const sec of planSections) {
      sqlite.prepare(`INSERT OR IGNORE INTO plan_sections (id, plan_id, title, content, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        crypto.randomUUID(), planId, sec.title, sec.content, sec.order, now, now
      );
    }
    console.log("✅ Mithril MCP plan created (document + canvas + diagram)");

    // Seed resources with URLs and tags
    const sampleResources = [
      { name: "Overclock Website", type: "tool", description: "Main website and staking portal", url: "https://overclock.one", tags: '["overclock", "main"]' },
      { name: "Overclock GitHub", type: "tool", description: "All repositories and open-source projects", url: "https://github.com/Overclock-Validator", tags: '["code", "github"]' },
      { name: "Mithril Repo", type: "tool", description: "Verifying node for Solana in Go", url: "https://github.com/Overclock-Validator/mithril", tags: '["mithril", "go"]' },
      { name: "Solana Explorer", type: "tool", description: "Block explorer and validator stats", url: "https://explorer.solana.com", tags: '["solana", "tool"]' },
      { name: "StakeWiz", type: "tool", description: "Validator performance analytics", url: "https://stakewiz.com", tags: '["analytics", "staking"]' },
      { name: "Validators App", type: "tool", description: "Validator monitoring and health checks", url: "https://www.validators.app", tags: '["monitoring", "tool"]' },
      { name: "Solana Docs", type: "document", description: "Official Solana documentation", url: "https://solana.com/docs", tags: '["docs", "solana"]' },
      { name: "Hetzner Console", type: "tool", description: "Server infrastructure management", url: "https://console.hetzner.cloud", tags: '["infra", "servers"]' },
    ];

    for (const res of sampleResources) {
      sqlite.prepare(`INSERT OR IGNORE INTO resources (id, name, type, description, url, tags, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        crypto.randomUUID(), res.name, res.type, res.description, res.url ?? null, res.tags ?? "[]", adminId, now, now
      );
    }
    console.log("✅ Sample resources created");

    // Seed pins — Overclock/Mithril focused
    const samplePins = [
      { title: "Mithril Repository", url: "https://github.com/Overclock-Validator/mithril", description: "Verifying node for Solana blockchain, implemented in Go", tags: '["mithril", "go"]', color: "#14F195" },
      { title: "Overclock GitHub", url: "https://github.com/Overclock-Validator", description: "All Overclock repositories and open-source projects", tags: '["overclock", "code"]', color: "#9A66D9" },
      { title: "Shredcaster", url: "https://github.com/Overclock-Validator/shredcaster", description: "Shred broadcasting tool for Solana validators", tags: '["infra", "rust"]', color: "#3B82F6" },
      { title: "Agave Client", url: "https://github.com/Overclock-Validator/agave", description: "Fork of Anza's Solana validator client", tags: '["validator", "rust"]', color: "#F59E0B" },
      { title: "Jito-Solana Fork", url: "https://github.com/Overclock-Validator/jito-solana", description: "MEV-enabled Solana client fork", tags: '["mev", "validator"]', color: "#10B981" },
      { title: "Snapshot Finder", url: "https://github.com/Overclock-Validator/solana-snapshot-finder-go", description: "Go implementation for locating Solana snapshots", tags: '["tool", "go"]', color: "#EF4444" },
      { title: "Solana Validator Docs", url: "https://docs.solanalabs.com/operations", description: "Official guide for running Solana validators", tags: '["docs", "solana"]', color: "#6366F1" },
      { title: "Overclock Website", url: "https://overclock.one", description: "Main website — staking info and team", tags: '["overclock", "main"]', color: "#EC4899" },
    ];

    for (const pin of samplePins) {
      sqlite.prepare(`INSERT OR IGNORE INTO pins (id, title, url, description, tags, color, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        crypto.randomUUID(), pin.title, pin.url, pin.description, pin.tags, pin.color, adminId, now, now
      );
    }
    console.log("✅ Sample research pins created");

    // ── Seed Projects ──
    const mithrilProjectId = crypto.randomUUID();
    sqlite.prepare(`INSERT OR IGNORE INTO projects (id, title, description, icon, color, starred, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      mithrilProjectId, "Mithril", "Solana verifying full node implemented in Go — replays every mainnet block and reproduces bank hashes independently", "⚡", "#14F195", 1, "active", adminId, now - 10 * day, now
    );

    const lightbringerProjectId = crypto.randomUUID();
    sqlite.prepare(`INSERT OR IGNORE INTO projects (id, title, description, icon, color, starred, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      lightbringerProjectId, "Lightbringer", "Next-generation validator client research and development", "🔥", "#F59E0B", 0, "active", adminId, now - 5 * day, now
    );

    // Mithril sections
    const mithrilLinks = JSON.stringify([
      { title: "Mithril GitHub", url: "https://github.com/Overclock-Validator/mithril" },
      { title: "Shredcaster", url: "https://github.com/Overclock-Validator/shredcaster" },
      { title: "Agave Fork", url: "https://github.com/Overclock-Validator/agave" },
      { title: "Snapshot Finder", url: "https://github.com/Overclock-Validator/solana-snapshot-finder-go" },
      { title: "Solana Validator Docs", url: "https://docs.solanalabs.com/operations" },
    ]);

    sqlite.prepare(`INSERT OR IGNORE INTO project_sections (id, project_id, title, type, content, canvas_data, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      crypto.randomUUID(), mithrilProjectId, "Key Resources", "links", mithrilLinks, "{}", 0, now, now
    );
    sqlite.prepare(`INSERT OR IGNORE INTO project_sections (id, project_id, title, type, content, canvas_data, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      crypto.randomUUID(), mithrilProjectId, "Architecture", "architecture", "", canvasData, 1, now, now
    );
    sqlite.prepare(`INSERT OR IGNORE INTO project_sections (id, project_id, title, type, content, canvas_data, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      crypto.randomUUID(), mithrilProjectId, "Dev Notes", "notes", "Mithril is written in Go and uses goroutines for concurrent block verification. Key areas:\n\n• Shred receiver assembles UDP packets into entries\n• Block verifier checks PoH continuity and leader schedule\n• State manager maintains local accounts state\n• Snapshot finder bootstraps new nodes quickly\n\nCurrent focus: optimizing verification latency and reducing memory footprint for the fastcache layer.", "{}", 2, now, now
    );

    // Lightbringer sections
    sqlite.prepare(`INSERT OR IGNORE INTO project_sections (id, project_id, title, type, content, canvas_data, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      crypto.randomUUID(), lightbringerProjectId, "Overview", "notes", "Lightbringer is our research initiative into next-generation validator client architecture. Exploring:\n\n• Alternative consensus participation models\n• Reduced hardware requirements for full verification\n• Novel approaches to state management and snapshot handling\n\nCurrently in early research phase — gathering references and building proof-of-concept components.", "{}", 0, now, now
    );
    const lbLinks = JSON.stringify([
      { title: "Solana Validator Economics", url: "https://solana.com/docs/economics" },
      { title: "Jito Foundation", url: "https://www.jito.network" },
      { title: "Firedancer (Jump)", url: "https://github.com/firedancer-io/firedancer" },
    ]);
    sqlite.prepare(`INSERT OR IGNORE INTO project_sections (id, project_id, title, type, content, canvas_data, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      crypto.randomUUID(), lightbringerProjectId, "References", "links", lbLinks, "{}", 1, now, now
    );

    console.log("✅ Projects created (Mithril + Lightbringer)");

    console.log("\n🎉 Seed complete!\n");
    console.log("📧 Login credentials (all admin, password: admin123!):");
    teamAccounts.forEach(a => console.log(`   ${a.name}: ${a.email}`));
  } catch (error: any) {
    if (error.message?.includes("UNIQUE")) {
      console.log("⚠️  Users already exist, skipping seed");
    } else {
      console.error("Error seeding:", error);
    }
  }
}

seed().then(() => {
  sqlite.close();
  process.exit(0);
}).catch((err) => {
  console.error(err);
  sqlite.close();
  process.exit(1);
});
