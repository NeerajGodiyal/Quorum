/**
 * Parses a markdown file and generates a well-connected React Flow architecture.
 *
 * Strategy:
 * - H2 = group/layer nodes (top-level)
 * - H3 = component nodes (children of groups)
 * - Groups connect to their children (vertical)
 * - Sequential children connect left-to-right within a group
 * - Cross-references in text create extra edges
 * - Layout: tree-like top-down with groups as rows
 */

const TYPE_KEYWORDS: Record<string, string[]> = {
  database: ["database", "db", "sqlite", "postgres", "mysql", "mongo", "redis", "storage", "store", "data"],
  api: ["api", "endpoint", "rest", "graphql", "rpc", "route", "server action", "http"],
  auth: ["auth", "security", "login", "session", "token", "permission", "rbac", "oauth", "credential"],
  service: ["service", "server", "daemon", "worker", "queue", "socket", "websocket", "real-time", "microservice"],
  processor: ["processor", "handler", "pipeline", "task", "job", "scheduler", "cron", "engine", "runtime"],
  component: ["component", "ui", "frontend", "client", "app", "page", "view", "dashboard", "interface"],
  layer: ["layer", "protocol", "transport", "network", "infrastructure", "deploy", "stage", "phase"],
};

const SHAPE_MAP: Record<string, string> = {
  database: "cylinder",
  api: "hexagon",
  auth: "diamond",
  service: "pill",
  processor: "parallelogram",
  component: "rectangle",
  layer: "rounded",
};

function detectType(text: string): string {
  const lower = text.toLowerCase();
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return "component";
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 40);
}

interface ParsedItem {
  id: string;
  label: string;
  description: string;
  type: string;
  group: string;
  isGroup: boolean;
}

export function parseMdToArchitecture(markdown: string): { nodes: any[]; edges: any[] } {
  const lines = markdown.split("\n");
  const items: ParsedItem[] = [];

  let currentGroup = "";
  let currentItem: ParsedItem | null = null;
  let descLines: string[] = [];

  const flush = () => {
    if (currentItem) {
      currentItem.description = descLines.slice(0, 2).join(". ").substring(0, 100);
      if (!currentItem.isGroup) {
        currentItem.type = detectType(`${currentItem.label} ${currentItem.description}`);
      }
      items.push(currentItem);
      currentItem = null;
      descLines = [];
    }
  };

  for (const line of lines) {
    const t = line.trim();

    if (t.startsWith("# ") && !t.startsWith("## ")) {
      // H1 — skip (title)
      continue;
    }

    if (t.startsWith("## ")) {
      flush();
      const label = t.replace("## ", "").replace(/^\d+[\.\)]\s*/, "").trim();
      if (!label) continue;
      currentGroup = label;
      currentItem = { id: `g-${slugify(label)}`, label, description: "", type: "layer", group: "", isGroup: true };
    } else if (t.startsWith("### ")) {
      flush();
      const label = t.replace("### ", "").replace(/^\d+[\.\)]\s*/, "").trim();
      if (!label) continue;
      currentItem = { id: slugify(label), label, description: "", type: "component", group: currentGroup, isGroup: false };
    } else if ((t.startsWith("- ") || t.startsWith("* ") || t.startsWith("• ")) && currentItem) {
      const bullet = t.replace(/^[-*•]\s*/, "").trim();
      if (bullet.length > 5 && descLines.length < 2) descLines.push(bullet);
    } else if (t.length > 15 && currentItem && !t.startsWith("#") && !t.startsWith("```") && !t.startsWith("|") && !t.startsWith("─") && !t.startsWith("┌") && !t.startsWith("└") && !t.startsWith("│")) {
      if (descLines.length < 2) descLines.push(t);
    }
  }
  flush();

  // Fallback: if no H3s, use H2s as leaf nodes
  const groups = items.filter((i) => i.isGroup);
  const leaves = items.filter((i) => !i.isGroup);
  if (leaves.length === 0 && groups.length > 0) {
    // Convert groups to leaves
    items.length = 0;
    for (const g of groups) {
      items.push({ ...g, isGroup: false, type: detectType(g.label) });
    }
  }

  // Build nodes with tree layout
  const nodes: any[] = [];
  const edges: any[] = [];
  const edgeStyle = { stroke: "rgba(255,255,255,0.1)", strokeWidth: 1.5 };
  const marker = { type: "arrowclosed", width: 14, height: 14, color: "rgba(255,255,255,0.15)" };

  // Collect groups and their children
  const groupChildren = new Map<string, ParsedItem[]>();
  const groupItems: ParsedItem[] = [];

  for (const item of items) {
    if (item.isGroup) {
      groupItems.push(item);
      if (!groupChildren.has(item.label)) groupChildren.set(item.label, []);
    } else {
      const children = groupChildren.get(item.group) ?? [];
      children.push(item);
      groupChildren.set(item.group, children);
    }
  }

  // If no groups at all, just lay items out in a grid
  if (groupItems.length === 0) {
    const allLeaves = items.filter((i) => !i.isGroup);
    const cols = Math.min(4, Math.ceil(Math.sqrt(allLeaves.length)));
    allLeaves.forEach((item, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const shape = SHAPE_MAP[item.type] ?? "rectangle";
      nodes.push({
        id: item.id, type: item.type,
        position: { x: col * 220 + 40, y: row * 120 + 40 },
        data: { label: item.label, nodeType: item.type, description: item.description, shape },
      });
      // Connect sequentially
      if (i > 0) {
        edges.push({ id: `e-${allLeaves[i - 1].id}-${item.id}`, source: allLeaves[i - 1].id, target: item.id, animated: true, style: edgeStyle, markerEnd: marker });
      }
    });
    return { nodes, edges };
  }

  // Layout groups top-to-bottom, children spread horizontally
  let y = 0;
  let prevGroupId = "";

  for (const group of groupItems) {
    const children = groupChildren.get(group.label) ?? [];
    const totalWidth = Math.max(1, children.length) * 220;
    const groupX = totalWidth / 2 - 80;

    // Group node
    nodes.push({
      id: group.id, type: "layer",
      position: { x: groupX, y },
      data: { label: group.label, nodeType: "layer", description: `${children.length} component${children.length !== 1 ? "s" : ""}`, shape: "rounded" },
    });

    // Connect groups sequentially (top-down flow)
    if (prevGroupId) {
      edges.push({ id: `e-${prevGroupId}-${group.id}`, source: prevGroupId, target: group.id, animated: true, style: edgeStyle, markerEnd: marker });
    }
    prevGroupId = group.id;

    // Children row
    if (children.length > 0) {
      const childY = y + 100;
      children.forEach((child, ci) => {
        const childX = ci * 220 + 40;
        const shape = SHAPE_MAP[child.type] ?? "rectangle";
        nodes.push({
          id: child.id, type: child.type,
          position: { x: childX, y: childY },
          data: { label: child.label, nodeType: child.type, description: child.description, shape },
        });

        // Connect group → child
        edges.push({ id: `e-${group.id}-${child.id}`, source: group.id, target: child.id, animated: true, style: edgeStyle, markerEnd: marker });

        // Connect siblings left-to-right
        if (ci > 0) {
          edges.push({ id: `e-sib-${children[ci - 1].id}-${child.id}`, source: children[ci - 1].id, target: child.id, animated: true, style: { stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }, markerEnd: marker });
        }
      });

      y = childY + 130;
    } else {
      y += 130;
    }
  }

  // Cross-reference edges: if any node's text mentions another node's label
  const allLeaves = items.filter((i) => !i.isGroup);
  for (const src of allLeaves) {
    const srcText = `${src.label} ${src.description}`.toLowerCase();
    for (const tgt of allLeaves) {
      if (src.id === tgt.id || src.group === tgt.group) continue;
      const tgtWords = tgt.label.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      if (tgtWords.some((w) => srcText.includes(w))) {
        const edgeId = `e-xref-${src.id}-${tgt.id}`;
        if (!edges.some((e) => e.id === edgeId)) {
          edges.push({ id: edgeId, source: src.id, target: tgt.id, animated: true, style: { stroke: "rgba(255,255,255,0.06)", strokeWidth: 1, strokeDasharray: "5,5" }, markerEnd: marker });
        }
      }
    }
  }

  return { nodes, edges };
}
