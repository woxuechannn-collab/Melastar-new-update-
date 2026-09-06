# Deploy Melastar Discord Bot on Railway

This archive contains the Melastar Discord bot, internal database package, workspace lockfile, and Railway configuration.

## 1. Create the Railway service

Extract this ZIP, push the extracted project to GitHub, and create a Railway service from that repository. Railway uses `railway.json` automatically.

```text
Build: pnpm --filter @workspace/api-server run build
Start: pnpm --filter @workspace/api-server run start
```

## 2. Add environment variables

In the Railway service Variables settings, add:

```text
DISCORD_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-discord-application-client-id
DATABASE_URL=your-railway-postgresql-connection-string
```

The included `.env.example` contains names only and no credentials. Do not commit real values to GitHub or place them in this ZIP. Railway provides `PORT` automatically.

## 3. Provision PostgreSQL

Add a PostgreSQL service in the same Railway project and set the bot service's `DATABASE_URL` to its connection string. After the first install, run once:

```bash
pnpm --filter @workspace/db run push
```

Then restart the bot service.

## 4. Enable Discord intents and permissions

In the Discord Developer Portal, enable these privileged intents under Bot settings:

- Message Content Intent
- Server Members Intent

The bot also needs these server permissions:

- View Channels
- Send Messages
- Kick Members
- Ban Members
- Moderate Members (for mute/timeouts)

The bot is restricted to Discord server ID `1519948122455806052` and leaves other servers automatically.

## 5. Moderation commands

These prefix commands are available only to the server owner or members with Administrator permission. Each target can be an ID, username, or ping/mention:

```text
?ban <ID|username|@mention> [reason]
?kick <ID|username|@mention> [reason]
?warn <ID|username|@mention> [reason]
```

All bot moderation responses are in English. Warning escalation is stored per server and user. The warning count automatically resets to 0 ten days after the most recent warning. A new warning starts a new 10-day reset window:

1. Warn 1: warning only
2. Warn 2: mute 1 minute
3. Warn 3: mute 5 minutes
4. Warn 4: mute 10 minutes
5. Warn 5: mute 30 minutes
6. Warn 6: mute 1 hour
7. Warn 7: mute 6 hours
8. Warn 8: mute 12 hours
9. Warn 9: mute 24 hours
10. Warn 10: temporary ban for 7 days, then automatic unban

Warning reset timers and temporary 7-day bans are recovered after a bot restart. Warn counts are capped at 10.

## 6. Giveaway commands

The bot registers `/giveaway` globally on startup. Its optional `description` is limited to 1000 characters, and its optional `thumbnail` accepts a complete HTTP(S) image URL. Both are stored in PostgreSQL and recovered across restarts.
