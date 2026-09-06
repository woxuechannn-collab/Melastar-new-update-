import { Collection, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import * as giveaway from "./giveaway";

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands = new Collection<string, Command>();

for (const cmd of [giveaway] as Command[]) {
  commands.set(cmd.data.name, cmd);
}

export default commands;
