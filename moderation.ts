import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const moderationWarningsTable = pgTable(
  "moderation_warnings",
  {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    warnCount: integer("warn_count").notNull().default(0),
    warnResetAt: timestamp("warn_reset_at", { withTimezone: true }),
    banUntil: timestamp("ban_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    guildUserUnique: uniqueIndex("moderation_warnings_guild_user_idx").on(
      table.guildId,
      table.userId,
    ),
  }),
);

export type ModerationWarning = typeof moderationWarningsTable.$inferSelect;