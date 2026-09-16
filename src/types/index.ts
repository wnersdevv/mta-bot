import type { ChatInputCommandInteraction, ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import type { User as DbUser } from "@prisma/client";

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction, ctx: CommandContext) => Promise<void>;
}

export interface CommandContext {
  dbUser: DbUser;
  language: string;
}

export interface ButtonHandler {
  customIdPrefix: string; // e.g. "profil:" or "garaj:gor:"
  execute: (interaction: ButtonInteraction) => Promise<void>;
}

export interface SelectMenuHandler {
  customIdPrefix: string;
  execute: (interaction: StringSelectMenuInteraction) => Promise<void>;
}

export interface ModalHandler {
  customIdPrefix: string;
  execute: (interaction: ModalSubmitInteraction) => Promise<void>;
}

export type AnyLocalizedInteraction = ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction;
