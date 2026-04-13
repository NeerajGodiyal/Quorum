# Overclock

Internal workspace for the Overclock team.

## Design System

**Always load the Koro Design System** before any UI/UX work. Run `/design-by-koro` at the start of every session that involves frontend changes.

The design system covers: typography scale, color tokens (dark mode), layout rules, motion/animation principles, interaction ergonomics, responsive patterns, component patterns, and quality assurance checklists.

Key rules:
- Background: `#0a0a0a`, surfaces use `white/[0.XX]` opacity pattern
- Typography: 22px titles, 14px body, 13px labels, all `foreground/XX` opacity
- Motion: stagger `index * 0.04`, exit 2x faster than enter, `duration-150` for CSS transitions
- Never use shadcn color tokens in page code (`bg-card`, `text-muted-foreground`, etc.)
- Always test at 375px, 1440px, and 1920px+
- Always `mx-auto` centered content

## Tech Stack

- Next.js 16 App Router + Tailwind v4 + shadcn/ui (base components only)
- Better Auth (email/password, admin plugin)
- Drizzle ORM + SQLite (WAL mode)
- Socket.IO (standalone server on port 3001)
- React Flow (architecture canvas)
- Mermaid (diagram rendering)
- Motion (Framer Motion) for animations
- pnpm workspaces monorepo

## Login Credentials

All accounts are admin. Accounts are created via Settings > Team (admin only).
Default seed password is set in scripts/seed.ts — change after first login.

- `smcio@overclock.one`
- `7layer@overclock.one`
- `dubbleosix@overclock.one`
- `rupansh@overclock.one`
- `koro@overclock.one`

## Commands

```bash
pnpm dev          # Start both servers (Next.js + Socket.IO)
pnpm db:seed      # Reseed database
pnpm dev:web      # Next.js only
pnpm dev:socket   # Socket.IO only
```
