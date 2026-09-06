import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const giveawaysTable = pgTable("giveaways", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  channelId: text("channel_id").notNull(),
  guildId: text("guild_id").notNull(),
  prize: text("prize").notNull(),
  description: text("description").notNull().default(""),
  thumbnail: text("thumbnail").notNull().default(""),
  winnersCount: integer("winners_count").notNull().default(1),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  hostTag: text("host_tag").notNull(),
  hostId: text("host_id").notNull().default(""),
  ended: boolean("ended").notNull().default(false),
  winnerIds: text("winner_ids").array().notNull().default([]),
  participants: text("participants").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGiveawaySchema = createInsertSchema(giveawaysTable).omit({
  id: true,
  createdAt: true,
  ended: true,
  winnerIds: true,
  participants: true,
});

export type InsertGiveaway = z.infer<typeof insertGiveawaySchema>;
export type Giveaway = typeof giveawaysTable.$inferSelect;
