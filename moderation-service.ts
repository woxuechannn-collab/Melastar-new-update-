import {
  Client,
  Guild,
  GuildMember,
  Message,
  PermissionFlagsBits,
} from "discord.js";
import { db, moderationWarningsTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { logger } from "../lib/logger";

const NO_EMOJI = "<:Nah:1546093682241835108>";
const HAPPY_EMOJI = "<:Happy2:1546094695451467846>";
const MAX_WARN_COUNT = 10;
const WARN_RESET_MS = 10 * 24 * 60 * 60 * 1000;
const TEMP_BAN_MS = 7 * 24 * 60 * 60 * 1000;

type WarningAction =
  | { kind: "warning"; label: string }
  | { kind: "timeout"; label: string; durationMs: number }
  | { kind: "ban"; label: string };

const WARNING_ACTIONS: WarningAction[] = [
  { kind: "warning", label: "a warning" },
  { kind: "timeout", label: "a 1-minute mute", durationMs: 1 * 60 * 1000 },
  { kind: "timeout", label: "a 5-minute mute", durationMs: 5 * 60 * 1000 },
  { kind: "timeout", label: "a 10-minute mute", durationMs: 10 * 60 * 1000 },
  { kind: "timeout", label: "a 30-minute mute", durationMs: 30 * 60 * 1000 },
  { kind: "timeout", label: "a 1-hour mute", durationMs: 60 * 60 * 1000 },
  { kind: "timeout", label: "a 6-hour mute", durationMs: 6 * 60 * 60 * 1000 },
  { kind: "timeout", label: "a 12-hour mute", durationMs: 12 * 60 * 60 * 1000 },
  { kind: "timeout", label: "a 24-hour mute", durationMs: 24 * 60 * 60 * 1000 },
  { kind: "ban", label: "a 7-day ban" },
];

const temporaryBanTimers = new Map<string, NodeJS.Timeout>();
const warningResetTimers = new Map<string, NodeJS.Timeout>();

function getWarningAction(warnCount: number): WarningAction {
  return WARNING_ACTIONS[Math.min(warnCount, MAX_WARN_COUNT) - 1]!;
}

function getTemporaryBanKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

async function resetWarnings(
  guildId: string,
  userId: string,
  resetAt: Date,
): Promise<void> {
  const key = getTemporaryBanKey(guildId, userId);
  warningResetTimers.delete(key);

  await db
    .update(moderationWarningsTable)
    .set({ warnCount: 0, warnResetAt: null, updatedAt: new Date() })
    .where(
      and(
        eq(moderationWarningsTable.guildId, guildId),
        eq(moderationWarningsTable.userId, userId),
        eq(moderationWarningsTable.warnResetAt, resetAt),
      ),
    );
  logger.info({ guildId, userId }, "Moderation warnings automatically reset");
}

function scheduleWarningReset(
  guildId: string,
  userId: string,
  resetAt: Date,
): void {
  const key = getTemporaryBanKey(guildId, userId);
  const existingTimer = warningResetTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);

  const delay = Math.max(0, resetAt.getTime() - Date.now());
  const timer = setTimeout(() => {
    void resetWarnings(guildId, userId, resetAt).catch((err) => {
      logger.warn({ err, guildId, userId }, "Could not reset moderation warnings");
    });
  }, delay);
  warningResetTimers.set(key, timer);
}

async function expireTemporaryBan(
  client: Client,
  guildId: string,
  userId: string,
): Promise<void> {
  const key = getTemporaryBanKey(guildId, userId);
  temporaryBanTimers.delete(key);

  try {
    const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
    await guild.members.unban(userId, "Warn 10/10: temporary 7-day ban expired");
    await db
      .update(moderationWarningsTable)
      .set({ banUntil: null, updatedAt: new Date() })
      .where(
        and(
          eq(moderationWarningsTable.guildId, guildId),
          eq(moderationWarningsTable.userId, userId),
        ),
      );
    logger.info({ guildId, userId }, "Temporary moderation ban expired");
  } catch (err) {
    logger.warn({ err, guildId, userId }, "Could not expire temporary moderation ban");
  }
}

function scheduleTemporaryBanExpiry(
  client: Client,
  guildId: string,
  userId: string,
  banUntil: Date,
): void {
  const key = getTemporaryBanKey(guildId, userId);
  const existingTimer = temporaryBanTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);

  const delay = Math.max(0, banUntil.getTime() - Date.now());
  const timer = setTimeout(() => {
    void expireTemporaryBan(client, guildId, userId);
  }, delay);
  temporaryBanTimers.set(key, timer);
}

export async function recoverTemporaryBans(client: Client): Promise<void> {
  const moderationRecords = await db
    .select()
    .from(moderationWarningsTable)
    .where(isNotNull(moderationWarningsTable.warnResetAt));

  for (const record of moderationRecords) {
    if (record.warnResetAt) {
      scheduleWarningReset(record.guildId, record.userId, record.warnResetAt);
    }
  }

  const activeBans = moderationRecords.filter((record) => record.banUntil);
  for (const record of activeBans) {
    if (record.banUntil) {
      scheduleTemporaryBanExpiry(
        client,
        record.guildId,
        record.userId,
        record.banUntil,
      );
    }
  }

  if (moderationRecords.length > 0) {
    logger.info(
      { count: moderationRecords.length },
      "Recovered moderation warning resets",
    );
  }
  if (activeBans.length > 0) {
    logger.info({ count: activeBans.length }, "Recovered temporary moderation bans");
  }
}

function hasModerationAccess(message: Message<true>): boolean {
  const member = message.member;
  return Boolean(
    member &&
      (message.guild.ownerId === message.author.id ||
        member.permissions.has(PermissionFlagsBits.Administrator)),
  );
}

function normalizeTargetInput(input: string): string {
  return input.trim().replace(/^<@!?(\d+)>$/, "$1").replace(/^@/, "");
}

async function resolveMember(
  guild: Guild,
  input: string,
): Promise<GuildMember | null> {
  const normalized = normalizeTargetInput(input);
  if (!normalized) return null;

  if (/^\d{15,22}$/.test(normalized)) {
    return guild.members.fetch(normalized).catch(() => null);
  }

  const query = normalized.toLowerCase();
  const matches = guild.members.cache.filter((member) => {
    const values = [
      member.user.username,
      member.user.globalName,
      member.displayName,
      member.user.tag,
    ]
      .filter(Boolean)
      .map((value) => value!.toLowerCase());
    return values.includes(query);
  });

  if (matches.size > 0) return matches.first()!;

  const searchResults = await guild.members
    .search({ query: normalized, limit: 10 })
    .catch(() => null);
  if (!searchResults || searchResults.size === 0) return null;

  return (
    searchResults.find((member) => {
      const values = [
        member.user.username,
        member.user.globalName,
        member.displayName,
        member.user.tag,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());
      return values.includes(query);
    }) ??
    searchResults.first() ??
    null
  );
}

function canActOnMember(
  issuer: GuildMember,
  target: GuildMember,
  clientUserId: string,
): boolean {
  if (target.id === issuer.id || target.id === clientUserId) return false;
  if (target.id === target.guild.ownerId) return false;
  if (issuer.id !== target.guild.ownerId) {
    if (
      target.roles.highest.comparePositionTo(issuer.roles.highest) >= 0
    ) {
      return false;
    }
  }
  return true;
}

function formatReason(
  author: Message<true>["author"],
  reasonParts: string[],
): string {
  const reason = reasonParts.join(" ").trim();
  return reason || `Moderation command by ${author.tag}`;
}

async function handleBan(
  message: Message<true>,
  target: GuildMember,
  reason: string,
): Promise<void> {
  if (!target.bannable) {
    await message.reply(
      `${NO_EMOJI} I cannot ban ${target.user.tag}. Check the role hierarchy and the Ban Members permission.`,
    );
    return;
  }

  await target.ban({ reason, deleteMessageSeconds: 0 });
  await message.reply(
    `${HAPPY_EMOJI} Banned **${target.user.tag}**.\n> Reason: ${reason}`,
  );
}

async function handleKick(
  message: Message<true>,
  target: GuildMember,
  reason: string,
): Promise<void> {
  if (!target.kickable) {
    await message.reply(
      `${NO_EMOJI} I cannot kick ${target.user.tag}. Check the role hierarchy and the Kick Members permission.`,
    );
    return;
  }

  await target.kick(reason);
  await message.reply(
    `${HAPPY_EMOJI} Kicked **${target.user.tag}**.\n> Reason: ${reason}`,
  );
}

async function recordWarning(
  guildId: string,
  userId: string,
): Promise<{ warnCount: number; resetAt: Date }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + WARN_RESET_MS);
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(moderationWarningsTable)
      .where(
        and(
          eq(moderationWarningsTable.guildId, guildId),
          eq(moderationWarningsTable.userId, userId),
        ),
      );

    const currentCount =
      existing?.warnResetAt && existing.warnResetAt <= now
        ? 0
        : (existing?.warnCount ?? 0);
    const warnCount = Math.min(currentCount + 1, MAX_WARN_COUNT);

    if (existing) {
      await tx
        .update(moderationWarningsTable)
        .set({ warnCount, warnResetAt: resetAt, updatedAt: now })
        .where(eq(moderationWarningsTable.id, existing.id));
    } else {
      await tx.insert(moderationWarningsTable).values({
        guildId,
        userId,
        warnCount,
        warnResetAt: resetAt,
      });
    }

    return { warnCount, resetAt };
  });

  scheduleWarningReset(guildId, userId, result.resetAt);
  return result;
}

async function handleWarn(
  client: Client,
  message: Message<true>,
  target: GuildMember,
  reason: string,
): Promise<void> {
  const { warnCount } = await recordWarning(message.guild.id, target.id);
  const action = getWarningAction(warnCount);

  if (action.kind === "warning") {
    await message.reply(
      `${HAPPY_EMOJI} **${target.user.tag}** received warning **${warnCount}/${MAX_WARN_COUNT}**.\n> Reason: ${reason}`,
    );
    return;
  }

  if (action.kind === "timeout") {
    if (!target.moderatable) {
      await message.reply(
        `${NO_EMOJI} Warning **${warnCount}/${MAX_WARN_COUNT}** was recorded, but I cannot mute ${target.user.tag}.`,
      );
      return;
    }

    await target.timeout(action.durationMs, reason);
    await message.reply(
      `${HAPPY_EMOJI} **${target.user.tag}** received warning **${warnCount}/${MAX_WARN_COUNT}** and received ${action.label}.\n> Reason: ${reason}`,
    );
    return;
  }

  if (!target.bannable) {
    await message.reply(
      `${NO_EMOJI} Warning **${warnCount}/${MAX_WARN_COUNT}** was recorded, but I cannot ban ${target.user.tag}.`,
    );
    return;
  }

  await target.ban({
    reason: `Warn ${warnCount}/${MAX_WARN_COUNT}: ${reason}`,
    deleteMessageSeconds: 0,
  });

  const banUntil = new Date(Date.now() + TEMP_BAN_MS);
  await db
    .update(moderationWarningsTable)
    .set({ banUntil, updatedAt: new Date() })
    .where(
      and(
        eq(moderationWarningsTable.guildId, message.guild.id),
        eq(moderationWarningsTable.userId, target.id),
      ),
    );
  scheduleTemporaryBanExpiry(client, message.guild.id, target.id, banUntil);

  await message.reply(
    `${HAPPY_EMOJI} **${target.user.tag}** reached warning **${MAX_WARN_COUNT}/${MAX_WARN_COUNT}** and received a 7-day ban.\n> Reason: ${reason}`,
  );
}

export async function handleModerationMessage(
  message: Message,
): Promise<void> {
  if (!message.guild || message.author.bot || !message.content.startsWith("?")) {
    return;
  }

  const parts = message.content.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();
  if (!command || !["?ban", "?kick", "?warn"].includes(command)) return;

  if (!message.member || !hasModerationAccess(message as Message<true>)) {
    await message.reply(
      `${NO_EMOJI} Only the server owner or an administrator can use this command.`,
    );
    return;
  }

  const targetInput = parts[1];
  if (!targetInput) {
    await message.reply(
      `${NO_EMOJI} Usage: \`${command} <ID|username|@mention> [reason]\``,
    );
    return;
  }

  const target = await resolveMember(message.guild, targetInput);
  if (!target) {
    await message.reply(
      `${NO_EMOJI} Could not find member **${targetInput}** in this server.`,
    );
    return;
  }

  const issuer = message.member;
  const clientUserId = message.client.user?.id;
  if (!clientUserId || !canActOnMember(issuer, target, clientUserId)) {
    await message.reply(
      `${NO_EMOJI} You cannot moderate this member because of the role hierarchy, or the target is the owner or the bot.`,
    );
    return;
  }

  const reason = formatReason(message.author, parts.slice(2));
  if (command === "?ban") {
    await handleBan(message as Message<true>, target, reason);
  } else if (command === "?kick") {
    await handleKick(message as Message<true>, target, reason);
  } else {
    await handleWarn(message.client, message as Message<true>, target, reason);
  }
}