import fs from "node:fs";
import path from "node:path";
import type { Command, ButtonHandler, SelectMenuHandler, ModalHandler } from "@/types";
import { logger } from "@/utils/logger";

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

export function loadCommands(): Map<string, Command> {
  const commands = new Map<string, Command>();
  const dir = path.join(__dirname, "..", "commands");
  for (const file of walk(dir)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(file);
    const command: Command | undefined = mod.default;
    if (command?.data && command.execute) {
      commands.set(command.data.name, command);
    }
  }
  logger.info({ count: commands.size, commands: [...commands.keys()] }, "Commands loaded");
  return commands;
}

export function loadButtonHandlers(): ButtonHandler[] {
  const dir = path.join(__dirname, "..", "components", "buttons");
  const handlers: ButtonHandler[] = [];
  for (const file of walk(dir)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(file);
    const handler: ButtonHandler | undefined = mod.default;
    if (handler?.customIdPrefix && handler.execute) handlers.push(handler);
  }
  // Longest prefix first so more specific handlers win over broader ones.
  handlers.sort((a, b) => b.customIdPrefix.length - a.customIdPrefix.length);
  logger.info({ count: handlers.length }, "Button handlers loaded");
  return handlers;
}

export function loadSelectMenuHandlers(): SelectMenuHandler[] {
  const dir = path.join(__dirname, "..", "components", "selectMenus");
  const handlers: SelectMenuHandler[] = [];
  for (const file of walk(dir)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(file);
    const handler: SelectMenuHandler | undefined = mod.default;
    if (handler?.customIdPrefix && handler.execute) handlers.push(handler);
  }
  handlers.sort((a, b) => b.customIdPrefix.length - a.customIdPrefix.length);
  logger.info({ count: handlers.length }, "Select menu handlers loaded");
  return handlers;
}

export function loadModalHandlers(): ModalHandler[] {
  const dir = path.join(__dirname, "..", "components", "modals");
  const handlers: ModalHandler[] = [];
  if (!fs.existsSync(dir)) return handlers;
  for (const file of walk(dir)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(file);
    const handler: ModalHandler | undefined = mod.default;
    if (handler?.customIdPrefix && handler.execute) handlers.push(handler);
  }
  handlers.sort((a, b) => b.customIdPrefix.length - a.customIdPrefix.length);
  return handlers;
}
