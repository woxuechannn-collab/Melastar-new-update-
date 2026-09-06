import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { hasAllowedRole, replyNoPermission } from "../utils/permissions";
import {
  buildContainer,
  GIVEAWAY_BANNER,
  startCollector,
  makeButtons,
} from "../giveaway-service";
import { db, giveawaysTable } from "@workspace/db";

export const data = new SlashCommandBuilder()
  .setName("giveaway")
  .setDescription("Create a giveaway")
  .setDefaultMemberPermissions(0)
  .addStringOption((opt) =>
    opt.setName("prize").setDescription("The giveaway prize").setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("duration")
      .setDescription(
        "Duration of the giveaway. e.g. 10m (minutes), 2h (hours), 3d (days). Max 7d.",
      )
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("description")
      .setDescription("Optional description shown with the giveaway banner")
      .setMaxLength(1000),
  )
  .addStringOption((opt) =>
    opt
      .setName("thumbnail")
      .setDescription("Optional thumbnail image URL")
      .setMaxLength(1000),
  )
  .addIntegerOption((opt) =>
    opt
      .setName("winners")
      .setDescription("Number of winners (default: 1)")
      .setMinValue(1)
      .setMaxValue(20),
  );

const MAX_MINUTES = 7 * 24 * 60;

function parseDuration(input: string): number | null {
  const match = input.trim().toLowerCase().match(/^(\d+)(m|h|d)$/);
  if (!match) return null;
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  let minutes: number;
  if (unit === "m") minutes = value;
  else if (unit === "h") minutes = value * 60;
  else minutes = value * 24 * 60;
  if (minutes < 1 || minutes > MAX_MINUTES) return null;
  return minutes;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasAllowedRole(interaction))) {
    await replyNoPermission(interaction);
    return;
  }

  const prize = interaction.options.getString("prize", true);
  const description = interaction.options.getString("description")?.trim() ?? "";
  const thumbnail = interaction.options.getString("thumbnail")?.trim() ?? "";
  const durationRaw = interaction.options.getString("duration", true);
  const durationMinutes = parseDuration(durationRaw);

  if (durationMinutes === null) {
    await interaction.reply({
      content:
        "<:Nah:1546093682241835108> Invalid duration!\n\nUse the format: `10m` (minutes), `2h` (hours), `3d` (days).\nMaximum is **7d** (7 days).",
      ephemeral: true,
    });
    return;
  }

  if (thumbnail) {
    try {
      const thumbnailUrl = new URL(thumbnail);
      if (!["http:", "https:"].includes(thumbnailUrl.protocol)) {
        throw new Error("Unsupported thumbnail protocol");
      }
    } catch {
      await interaction.reply({
        content:
          "<:Nah:1546093682241835108> Invalid thumbnail URL. Use a complete `https://` image URL.",
        ephemeral: true,
      });
      return;
    }
  }

  const winners = interaction.options.getInteger("winners") ?? 1;
  const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  const endsAtUnix = Math.floor(endsAt.getTime() / 1000);
  const hostTag = interaction.user.tag;

  const activeLines = [
    `## <:Happy2:1546094695451467846> GIVEAWAY`,
    ``,
    `> <:Box2:1546092818768863283> **Prize:** \`${prize}\``,
    `> <:Star:1546092274708914216> **Winners:** \`${winners}\``,
    `> <:Timeupdate:1546092511750258708> **Ends:** <t:${endsAtUnix}:R> (<t:${endsAtUnix}:f>)`,
    `> <:Noname:1546092734518001674> **How to enter:** Click the <:Happy2:1546094695451467846> button below!`,
    ``,
    `-# Hosted by ${hostTag}`,
  ];

  const row = makeButtons(0);
  const container = buildContainer(
    GIVEAWAY_BANNER,
    activeLines,
    row,
    description,
    thumbnail,
  );

  const message = await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    fetchReply: true,
  });

  await db.insert(giveawaysTable).values({
    messageId: message.id,
    channelId: interaction.channelId,
    guildId: interaction.guildId!,
    prize,
    description,
    thumbnail,
    winnersCount: winners,
    endsAt,
    hostTag,
    hostId: interaction.user.id,
  });

  startCollector(
    interaction.client,
    message.id,
    interaction.channelId,
    prize,
    description,
    thumbnail,
    endsAt,
    hostTag,
    interaction.user.id,
    winners,
  );
}
