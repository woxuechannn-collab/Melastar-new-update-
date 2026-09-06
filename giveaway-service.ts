import { db, giveawaysTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  Client,
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  TextChannel,
  SectionBuilder,
  ThumbnailBuilder,
} from "discord.js";
import { logger } from "../lib/logger";
import { hasAllowedRole } from "./utils/permissions";

export const GIVEAWAY_BANNER =
  "https://cdn.discordapp.com/attachments/1522975140462330107/1538389525984837783/file_00000000d8008209bcbda7490f3ac983.png?ex=6a828064&is=6a812ee4&hm=7ae0bf2d3b41d35766379012d0310e64efeee23ce609e976499dfdcc017b51d7&";
export const WINNER_BANNER =
  "https://cdn.discordapp.com/attachments/1522975140462330107/1538389539175931944/file_000000005c208206bcd11fedfc6b9400.png?ex=6a828068&is=6a812ee8&hm=00d832cf2fa9a0f1c2dae13776746bf81bcf5b5a4a4d51f88d530ad927293367&";

const EMOJI = {
  box: { name: "Box2", id: "1546092818768863283" },
  winner: { name: "Star", id: "1546092274708914216" },
  happy: { name: "Happy2", id: "1546094695451467846" },
  time: { name: "Timeupdate", id: "1546092511750258708" },
  entries: { name: "Profile", id: "1546093727838117960" },
  no: { name: "Nah", id: "1546093682241835108" },
} as const;

const REROLL_LOG_CHANNEL_ID = "1546141062719078562";

interface ActiveGiveaway {
  prize: string;
  description: string;
  thumbnail: string;
  endsAt: Date;
  hostTag: string;
  hostId: string;
  winnersCount: number;
  channelId: string;
}

export const activeGiveaways = new Map<string, ActiveGiveaway>();

export function buildContainer(
  banner: string,
  lines: string[],
  buttons: ActionRowBuilder<ButtonBuilder>,
  description = "",
  thumbnail = "",
): ContainerBuilder {
  const mediaItem = new MediaGalleryItemBuilder().setURL(banner);
  if (description) {
    mediaItem.setDescription(description);
  }

  const container = new ContainerBuilder()
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(mediaItem),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

  if (thumbnail) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail)),
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(lines.join("\n")),
    );
  }

  return container
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    )
    .addActionRowComponents(buttons);
}

export function makeButtons(
  entries: number,
  ended = false,
): ActionRowBuilder<ButtonBuilder> {
  const joinBtn = new ButtonBuilder()
    .setCustomId(ended ? "giveaway_join_ended" : "giveaway_join")
    .setLabel(ended ? "Ended" : "Enter")
    .setEmoji(EMOJI.happy)
    .setStyle(ended ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setDisabled(ended);
  const countBtn = new ButtonBuilder()
    .setCustomId("giveaway_list")
    .setLabel(`${entries} entries`)
    .setEmoji(EMOJI.entries)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(false);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(joinBtn, countBtn);
}

export function makeRerollButton(giveawayMessageId: string): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(`giveaway_reroll:${giveawayMessageId}`)
    .setLabel("Reroll")
    .setEmoji(EMOJI.winner)
    .setStyle(ButtonStyle.Primary);
}

export async function handleListButton(interaction: ButtonInteraction) {
  const messageId = interaction.message.id;

  const [dbRow] = await db
    .select()
    .from(giveawaysTable)
    .where(eq(giveawaysTable.messageId, messageId));

  if (!dbRow) {
    await interaction.reply({
      content: "<:Nah:1546093682241835108> Giveaway not found.",
      ephemeral: true,
    });
    return;
  }

  const participants = dbRow.participants;

  if (participants.length === 0) {
    await interaction.reply({ content: "**No one has entered yet!**", ephemeral: true });
    return;
  }

  const mentions = participants.map((id, i) => `${i + 1}. <@${id}>`).join("\n");

  const chunks: string[] = [];
  const lines = mentions.split("\n");
  let current = `**Participants (${participants.length}):**\n`;
  for (const line of lines) {
    if ((current + "\n" + line).length > 1900) {
      chunks.push(current);
      current = line;
    } else {
      current += (current === "" ? "" : "\n") + line;
    }
  }
  if (current) chunks.push(current);

  await interaction.reply({ content: chunks[0], ephemeral: true });
  for (let i = 1; i < chunks.length; i++) {
    await interaction.followUp({ content: chunks[i], ephemeral: true });
  }
}

export async function handleRerollButton(
  interaction: ButtonInteraction,
  messageId: string,
) {
  const [dbRow] = await db
    .select()
    .from(giveawaysTable)
    .where(eq(giveawaysTable.messageId, messageId));

  if (!dbRow) {
    await interaction.reply({
      content: "<:Nah:1546093682241835108> Giveaway not found.",
      ephemeral: true,
    });
    return;
  }

  if (!(await hasAllowedRole(interaction))) {
    await interaction.reply({
      content: "<:Nah:1546093682241835108> You do not have permission to reroll giveaways.",
      ephemeral: true,
    });
    return;
  }

  if (!dbRow.ended) {
    await interaction.reply({
      content: "<:Nah:1546093682241835108> This giveaway has not ended yet.",
      ephemeral: true,
    });
    return;
  }

  const previousWinners = new Set(dbRow.winnerIds);
  const eligibleParticipants = dbRow.participants.filter(
    (participantId) => !previousWinners.has(participantId),
  );

  if (eligibleParticipants.length === 0) {
    await interaction.reply({
      content: "<:Nah:1546093682241835108> There are no eligible participants for a reroll.",
      ephemeral: true,
    });
    return;
  }

  const winnerIds = [...eligibleParticipants]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(dbRow.winnersCount, eligibleParticipants.length));
  const winnerMentions = winnerIds.map((id) => `<@${id}>`).join(", ");

  await interaction.deferReply({ ephemeral: true });

  try {
    const channel = await interaction.client.channels.fetch(dbRow.channelId);
    if (!(channel instanceof TextChannel)) {
      await interaction.editReply("Could not find the giveaway channel.");
      return;
    }

    const message = await channel.messages.fetch(messageId);
    const endedAtUnix = Math.floor(dbRow.endsAt.getTime() / 1000);
    const endedLines = [
      `## <:Happy2:1546094695451467846> GIVEAWAY ENDED`,
      ``,
      `> <:Box2:1546092818768863283> **Prize:** \`${dbRow.prize}\``,
      `> <:Star:1546092274708914216> **Winner(s):** ${winnerMentions}`,
      `> <:Timeupdate:1546092511750258708> **Ended:** <t:${endedAtUnix}:f>`,
      ``,
      `-# Hosted by ${dbRow.hostTag}`,
    ];

    await message.edit({
      components: [
        buildContainer(
          WINNER_BANNER,
          endedLines,
          makeButtons(dbRow.participants.length, true),
          dbRow.description,
          dbRow.thumbnail,
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });

    await db
      .update(giveawaysTable)
      .set({ winnerIds })
      .where(eq(giveawaysTable.messageId, messageId));

    await channel.send({
      content: `<:Happy2:1546094695451467846> Congratulations ${winnerMentions}! You won **\`${dbRow.prize}\`** in the reroll!`,
    });

    await interaction.editReply("The giveaway winner has been rerolled.");
  } catch (err) {
    logger.error({ err, messageId }, "Failed to reroll giveaway");
    await interaction.editReply("Could not reroll the giveaway right now.");
  }
}

export async function handleJoinButton(interaction: ButtonInteraction) {
  const messageId = interaction.message.id;
  const giveaway = activeGiveaways.get(messageId);

  if (!giveaway) {
    await interaction.reply({
      content: "<:Nah:1546093682241835108> This giveaway is no longer active.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();

  const userId = interaction.user.id;

  const [dbRow] = await db
    .select()
    .from(giveawaysTable)
    .where(eq(giveawaysTable.messageId, messageId));

  if (!dbRow || dbRow.ended) {
    await interaction.followUp({
      content: "<:Nah:1546093682241835108> This giveaway has already ended.",
      ephemeral: true,
    });
    return;
  }

  let newParticipants: string[];
  let joined: boolean;

  if (dbRow.participants.includes(userId)) {
    newParticipants = dbRow.participants.filter((id) => id !== userId);
    joined = false;
  } else {
    newParticipants = [...dbRow.participants, userId];
    joined = true;
  }

  await db
    .update(giveawaysTable)
    .set({ participants: newParticipants })
    .where(eq(giveawaysTable.messageId, messageId));

  await interaction.followUp({
    content: joined
      ? "<:Happy2:1546094695451467846> You have entered the giveaway! Good luck!"
      : "<:Nah:1546093682241835108> You have left the giveaway.",
    ephemeral: true,
  });

  const endsAtUnix = Math.floor(giveaway.endsAt.getTime() / 1000);
  const activeLines = [
    `## <:Happy2:1546094695451467846> GIVEAWAY`,
    ``,
    `> <:Box2:1546092818768863283> **Prize:** \`${giveaway.prize}\``,
    `> <:Star:1546092274708914216> **Winners:** \`${giveaway.winnersCount}\``,
    `> <:Timeupdate:1546092511750258708> **Ends:** <t:${endsAtUnix}:R> (<t:${endsAtUnix}:f>)`,
    `> <:Noname:1546092734518001674> **How to enter:** Click the <:Happy2:1546094695451467846> button below!`,
    ``,
    `-# Hosted by ${giveaway.hostTag}`,
  ];

  await interaction.message.edit({
    components: [
      buildContainer(
        GIVEAWAY_BANNER,
        activeLines,
        makeButtons(newParticipants.length),
        giveaway.description,
        giveaway.thumbnail,
      ),
    ],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function finalizeGiveaway(
  client: Client,
  messageId: string,
  channelId: string,
  prize: string,
  description: string,
  thumbnail: string,
  endsAtUnix: number,
  hostTag: string,
  winnersCount: number,
  participants: string[],
) {
  activeGiveaways.delete(messageId);

  const endRow = makeButtons(participants.length, true);

  try {
    const channel = await client.channels.fetch(channelId);
    if (!(channel instanceof TextChannel)) return;
    const message = await channel.messages.fetch(messageId);

    let winnerIds: string[] = [];

    if (participants.length === 0) {
      const endedLines = [
        `## <:Happy2:1546094695451467846> GIVEAWAY ENDED`,
        ``,
        `> <:Box2:1546092818768863283> **Prize:** \`${prize}\``,
        `> <:Nah:1546093682241835108> **No one entered the giveaway!**`,
        `> <:Timeupdate:1546092511750258708> **Ended:** <t:${endsAtUnix}:f>`,
        ``,
        `-# Hosted by ${hostTag}`,
      ];
      await message.edit({
         components: [
           buildContainer(
             WINNER_BANNER,
             endedLines,
             endRow,
             description,
             thumbnail,
           ),
         ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else {
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      winnerIds = shuffled.slice(0, Math.min(winnersCount, shuffled.length));
      const winnerMentions = winnerIds.map((id) => `<@${id}>`).join(", ");

      const endedLines = [
        `## <:Happy2:1546094695451467846> GIVEAWAY ENDED`,
        ``,
        `> <:Box2:1546092818768863283> **Prize:** \`${prize}\``,
        `> <:Star:1546092274708914216> **Winner(s):** ${winnerMentions}`,
        `> <:Timeupdate:1546092511750258708> **Ended:** <t:${endsAtUnix}:f>`,
        ``,
        `-# Hosted by ${hostTag}`,
      ];
      await message.edit({
         components: [
           buildContainer(
             WINNER_BANNER,
             endedLines,
             endRow,
             description,
             thumbnail,
           ),
         ],
        flags: MessageFlags.IsComponentsV2,
      });
      await channel.send({
        content: `<:Happy2:1546094695451467846> Congratulations ${winnerMentions}! You won **\`${prize}\`**!`,
      });
    }

    await db
      .update(giveawaysTable)
      .set({ ended: true, winnerIds })
      .where(eq(giveawaysTable.messageId, messageId));

    if (winnerIds.length > 0) {
      try {
        const logChannel = await client.channels.fetch(REROLL_LOG_CHANNEL_ID);
        if (!(logChannel instanceof TextChannel)) {
          logger.warn(
            { channelId: REROLL_LOG_CHANNEL_ID, messageId },
            "Reroll log channel is not a text channel",
          );
        } else {
          await logChannel.send({
            content: `<:Star:1546092274708914216> Giveaway ended for **\`${prize}\`** in <#${channelId}>. Use the button below to reroll the winner.`,
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                makeRerollButton(messageId),
              ),
            ],
          });
        }
      } catch (err) {
        logger.warn(
          { err, messageId, channelId: REROLL_LOG_CHANNEL_ID },
          "Could not send reroll log message",
        );
      }
    }
  } catch (err) {
    logger.error({ err, messageId }, "Failed to finalize giveaway");
  }
}

export function startCollector(
  client: Client,
  messageId: string,
  channelId: string,
  prize: string,
  description: string,
  thumbnail: string,
  endsAt: Date,
  hostTag: string,
  hostId: string,
  winnersCount: number,
) {
  activeGiveaways.set(messageId, {
    prize,
    description,
    thumbnail,
    endsAt,
    hostTag,
    hostId,
    winnersCount,
    channelId,
  });

  const msLeft = endsAt.getTime() - Date.now();

  if (msLeft <= 0) {
    db.select()
      .from(giveawaysTable)
      .where(eq(giveawaysTable.messageId, messageId))
      .then(([row]) => {
        if (row && !row.ended) {
          finalizeGiveaway(
            client,
            messageId,
            channelId,
            prize,
            description,
            thumbnail,
            Math.floor(endsAt.getTime() / 1000),
            hostTag,
            winnersCount,
            row.participants,
          );
        }
      });
    return;
  }

  setTimeout(async () => {
    const [row] = await db
      .select()
      .from(giveawaysTable)
      .where(eq(giveawaysTable.messageId, messageId));
    await finalizeGiveaway(
      client,
      messageId,
      channelId,
      prize,
      description,
      thumbnail,
      Math.floor(endsAt.getTime() / 1000),
      hostTag,
      winnersCount,
      row?.participants ?? [],
    );
  }, msLeft);
}

export async function recoverGiveaways(client: Client) {
  const active = await db
    .select()
    .from(giveawaysTable)
    .where(eq(giveawaysTable.ended, false));

  if (active.length === 0) {
    logger.info("No active giveaways to recover");
    return;
  }

  logger.info({ count: active.length }, "Recovering active giveaways");

  for (const g of active) {
    startCollector(
      client,
      g.messageId,
      g.channelId,
      g.prize,
      g.description,
      g.thumbnail,
      g.endsAt,
      g.hostTag,
      g.hostId,
      g.winnersCount,
    );

    try {
      const channel = await client.channels.fetch(g.channelId);
      if (!(channel instanceof TextChannel)) continue;

      const message = await channel.messages.fetch(g.messageId);
      const endsAtUnix = Math.floor(g.endsAt.getTime() / 1000);
      const activeLines = [
        `## <:Happy2:1546094695451467846> GIVEAWAY`,
        ``,
        `> <:Box2:1546092818768863283> **Prize:** \`${g.prize}\``,
        `> <:Star:1546092274708914216> **Winners:** \`${g.winnersCount}\``,
        `> <:Timeupdate:1546092511750258708> **Ends:** <t:${endsAtUnix}:R> (<t:${endsAtUnix}:f>)`,
        `> <:Noname:1546092734518001674> **How to enter:** Click the <:Happy2:1546094695451467846> button below!`,
        ``,
        `-# Hosted by ${g.hostTag}`,
      ];

      await message.edit({
        components: [
          buildContainer(
            GIVEAWAY_BANNER,
            activeLines,
            makeButtons(g.participants.length),
            g.description,
            g.thumbnail,
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (err) {
      logger.warn({ err, messageId: g.messageId }, "Could not refresh recovered giveaway message");
    }
  }
}
