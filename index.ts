import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Guild,
} from "discord.js";
import { logger } from "../lib/logger";
import commands from "./commands";
import {
  recoverGiveaways,
  handleJoinButton,
  handleListButton,
  handleRerollButton,
} from "./giveaway-service";
import {
  handleModerationMessage,
  recoverTemporaryBans,
} from "./moderation-service";

const ALLOWED_GUILD_ID = "1519948122455806052";
const NO_EMOJI = "<:Nah:1546093682241835108>";

async function leaveUnauthorizedGuild(guild: Guild): Promise<void> {
  if (guild.id === ALLOWED_GUILD_ID) return;

  logger.warn(
    { guildId: guild.id, guildName: guild.name, allowedGuildId: ALLOWED_GUILD_ID },
    "Leaving unauthorized Discord server",
  );

  try {
    await guild.leave();
    logger.info({ guildId: guild.id, guildName: guild.name }, "Left unauthorized Discord server");
  } catch (err) {
    logger.error({ err, guildId: guild.id, guildName: guild.name }, "Failed to leave unauthorized Discord server");
  }
}

export async function startBot() {
  const token = process.env["DISCORD_TOKEN"];
  const clientId = process.env["DISCORD_CLIENT_ID"];

  if (!token) {
    logger.error("DISCORD_TOKEN is not set. Bot will not start.");
    return;
  }

  if (!clientId) {
    logger.error("DISCORD_CLIENT_ID is not set. Bot will not start.");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
  });

  client.once("ready", async (c) => {
    logger.info({ tag: c.user.tag }, "Discord bot is ready");

    for (const guild of c.guilds.cache.values()) {
      await leaveUnauthorizedGuild(guild);
    }

    const rest = new REST().setToken(token);
    const commandData = [...commands.values()].map((cmd) => cmd.data.toJSON());

    try {
      logger.info("Registering slash commands globally...");
      await rest.put(Routes.applicationCommands(clientId), {
        body: commandData,
      });
      logger.info("Slash commands registered successfully");
    } catch (err) {
      logger.error({ err }, "Failed to register slash commands");
    }

    try {
      await recoverGiveaways(c);
    } catch (err) {
      logger.error({ err }, "Failed to recover giveaways");
    }

    try {
      await recoverTemporaryBans(c);
    } catch (err) {
      logger.error({ err }, "Failed to recover temporary moderation bans");
    }
  });

  client.on("guildCreate", async (guild) => {
    await leaveUnauthorizedGuild(guild);
  });

  client.on("messageCreate", async (message) => {
    try {
      await handleModerationMessage(message);
    } catch (err) {
      logger.error({ err }, "Error executing moderation command");
      if (!message.author.bot) {
        await message
          .reply(`${NO_EMOJI} An error occurred while executing the command.`)
          .catch(() => undefined);
      }
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton()) {
      if (interaction.customId === "giveaway_join") {
        try {
          await handleJoinButton(interaction);
        } catch (err) {
          logger.error({ err }, "Error handling giveaway join button");
        }
      } else if (interaction.customId === "giveaway_list") {
        try {
          await handleListButton(interaction);
        } catch (err) {
          logger.error({ err }, "Error handling giveaway list button");
        }
      } else if (interaction.customId.startsWith("giveaway_reroll:")) {
        try {
          const giveawayMessageId = interaction.customId.slice("giveaway_reroll:".length);
          await handleRerollButton(interaction, giveawayMessageId);
        } catch (err) {
          logger.error({ err }, "Error handling giveaway reroll button");
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error({ err, command: interaction.commandName }, "Error executing command");
      const errorMsg = {
        content: "<:Nah:1546093682241835108> An error occurred while executing this command.",
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMsg);
      } else {
        await interaction.reply(errorMsg);
      }
    }
  });

  await client.login(token);
}
