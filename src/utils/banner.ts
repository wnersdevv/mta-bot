import chalk from "chalk";

/**
 * Prints a loud, colorful startup banner to the terminal. Purely cosmetic —
 * failures here (e.g. a non-TTY terminal that mangles ANSI codes) must never
 * crash the bot, so this is deliberately side-effect-free beyond console.log.
 */
export function printBanner(info: { botTag: string; guildCount: number; commandCount: number; language: string; nodeEnv: string }): void {
  const art = [
    "██╗    ██╗███╗   ██╗███████╗██████╗ ███████╗██████╗ ███████╗██╗   ██╗",
    "██║    ██║████╗  ██║██╔════╝██╔══██╗██╔════╝██╔══██╗██╔════╝██║   ██║",
    "██║ █╗ ██║██╔██╗ ██║█████╗  ██████╔╝███████╗██║  ██║█████╗  ██║   ██║",
    "██║███╗██║██║╚██╗██║██╔══╝  ██╔══██╗╚════██║██║  ██║██╔══╝  ╚██╗ ██╔╝",
    "╚███╔███╔╝██║ ╚████║███████╗██║  ██║███████║██████╔╝███████╗ ╚████╔╝ ",
    " ╚══╝╚══╝ ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚══════╝╚═════╝ ╚══════╝  ╚═══╝  ",
  ];

  // Rainbow gradient across the ASCII art lines, top to bottom.
  const gradient = [chalk.magentaBright, chalk.redBright, chalk.yellowBright, chalk.greenBright, chalk.cyanBright, chalk.blueBright];

  console.log();
  art.forEach((line, i) => console.log(gradient[i % gradient.length](line)));
  console.log();

  const divider = chalk.gray("─".repeat(64));
  console.log(divider);
  console.log(`  ${chalk.bold.whiteBright("🎮 GTA Online Discord Bot")}  ${chalk.dim("— powered by wnersdev.ts")}`);
  console.log(divider);
  console.log(`  ${chalk.green("●")} ${chalk.bold("Bot:")}       ${chalk.cyanBright(info.botTag)}`);
  console.log(`  ${chalk.green("●")} ${chalk.bold("Sunucular:")} ${chalk.cyanBright(String(info.guildCount))}`);
  console.log(`  ${chalk.green("●")} ${chalk.bold("Komutlar:")}  ${chalk.cyanBright(String(info.commandCount))}`);
  console.log(`  ${chalk.green("●")} ${chalk.bold("Dil:")}       ${chalk.cyanBright(info.language.toUpperCase())}`);
  console.log(`  ${chalk.green("●")} ${chalk.bold("Ortam:")}     ${info.nodeEnv === "production" ? chalk.redBright(info.nodeEnv) : chalk.yellowBright(info.nodeEnv)}`);
  console.log(divider);
  console.log(`  ${chalk.magentaBright("🚀")} ${chalk.bold.greenBright("Hazır! Discord'da /yardim yazarak başlayabilirsin.")}`);
  console.log(divider);
  console.log();
}
