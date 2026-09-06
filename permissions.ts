import { ButtonInteraction, ChatInputCommandInteraction } from "discord.js";

const ALLOWED_ROLE_IDS = [
  "1521056744774701179",
  "1519948312885858395",
  "1519949106712285236",
];

export async function hasAllowedRole(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
): Promise<boolean> {
  const member = interaction.member;
  if (!member) return false;

  const roles =
    typeof member.roles === "object" && "cache" in member.roles
      ? [...member.roles.cache.keys()]
      : (member.roles as string[]);

  return ALLOWED_ROLE_IDS.some((id) => roles.includes(id));
}

export async function replyNoPermission(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.reply({
    content: "<:Nah:1546093682241835108> You do not have permission to use this command.",
    ephemeral: true,
  });
}
