# Melastar Discord Bot

Discord moderation and giveaway bot with an Express health endpoint and PostgreSQL persistence.

## Run & Operate

- `pnpm run dev` — run the Discord bot and API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build the bot backend
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required secrets: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`
- Required database: Replit PostgreSQL, exposed as `DATABASE_URL`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

- Discord moderation commands: `?ban`, `?kick`, and `?warn`
- Warning escalation with temporary mutes and bans, recovered after restarts
- Persistent giveaways with slash commands and join/list buttons
- `GET /api/healthz` for deployment health checks

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The bot only stays in the configured Discord server ID.
- Discord Message Content and Server Members privileged intents must be enabled.
- The database schema must be pushed once with `pnpm --filter @workspace/db run push`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
