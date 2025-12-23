#!/usr/bin/env node

import chalk from "chalk";
import { select, confirm } from "@inquirer/prompts";
import Table from "cli-table3";
import { listarPortas, matarPorta, infoProcesso } from "./port-scanner.js";
import { criarSpinner } from "./spinner.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8"));
const VERSION = pkg.version;

const L1 = "    ____            __  _       __      __       __               ";
const L2 = "   / __ \\____  ____/ /_| |     / /___ _/ /______/ /_  ___  _____  ";
const L3 = "  / /_/ / __ \\/ __/ __/| | /| / / __ \`/ __/ ___/ __ \\/ _ \\/ ___/  ";
const L4 = " / ____/ /_/ / / / /_  | |/ |/ / /_/ / /_/ /__/ / / /  __/ /      ";
const L5 = "/_/    \\____/_/  \\__/  |__/|__/\\__,_/\\__/\\___/_/ /_/\\___/_/       ";
const BORDER = "══════════════════════════════════════════════════════════════════";

const ASCII_ART = `
  ${chalk.hex("#FF6B6B")("╔" + BORDER + "╗")}
  ${chalk.hex("#FF6B6B")("║")}${chalk.hex("#4ECDC4")(L1)}${chalk.hex("#FF6B6B")("║")}
  ${chalk.hex("#FF6B6B")("║")}${chalk.hex("#4ECDC4")(L2)}${chalk.hex("#FF6B6B")("║")}
  ${chalk.hex("#FF6B6B")("║")}${chalk.hex("#45B7D1")(L3)}${chalk.hex("#FF6B6B")("║")}
  ${chalk.hex("#FF6B6B")("║")}${chalk.hex("#45B7D1")(L4)}${chalk.hex("#FF6B6B")("║")}
  ${chalk.hex("#FF6B6B")("║")}${chalk.hex("#96CEB4")(L5)}${chalk.hex("#FF6B6B")("║")}
  ${chalk.hex("#FF6B6B")("╚" + BORDER + "╝")}

       ${chalk.hex("#FFE66D")("◉")} ${chalk.gray("TCP")}    ${chalk.hex("#4ECDC4")("◉")} ${chalk.gray("UDP")}    ${chalk.hex("#FF6B6B")("◉")} ${chalk.gray("KILL")}    ${chalk.hex("#96CEB4")("◉")} ${chalk.gray("REFRESH")}
`;

const MAIN_MENU = [
  {
    name: chalk.hex("#4ECDC4")("  List active ports"),
    value: "list",
    description: "Display all listening TCP/UDP ports"
  },
  {
    name: chalk.hex("#FF6B6B")("  Kill process by port"),
    value: "kill",
    description: "Terminate a process using a specific port"
  },
  {
    name: chalk.hex("#FFE66D")("  Real-time monitor"),
    value: "monitor",
    description: "Monitor ports in real-time"
  },
  {
    name: chalk.red("  Exit"),
    value: "exit",
    description: "Close the program"
  },
];

function displayHeader() {
  console.clear();
  console.log(ASCII_ART);
  console.log(chalk.gray("─".repeat(75)));
  console.log(
    chalk.white.bold("  PortWatcher ") +
    chalk.hex("#96CEB4")(`v${VERSION}`) +
    chalk.gray("  |  System Port Monitor")
  );
  console.log(chalk.gray("─".repeat(75)));
  console.log();
}

function createPortsTable(ports) {
  const table = new Table({
    head: [
      chalk.hex("#FFE66D").bold("PROTO"),
      chalk.hex("#FFE66D").bold("PORT"),
      chalk.hex("#FFE66D").bold("ADDRESS"),
      chalk.hex("#FFE66D").bold("PID"),
      chalk.hex("#FFE66D").bold("PROCESS")
    ],
    style: {
      head: [],
      border: ["gray"]
    },
    chars: {
      "top": "─", "top-mid": "┬", "top-left": "┌", "top-right": "┐",
      "bottom": "─", "bottom-mid": "┴", "bottom-left": "└", "bottom-right": "┘",
      "left": "│", "left-mid": "├", "mid": "─", "mid-mid": "┼",
      "right": "│", "right-mid": "┤", "middle": "│"
    }
  });

  for (const port of ports) {
    const protoColor = port.protocol === "TCP" ? chalk.hex("#4ECDC4") : chalk.hex("#96CEB4");
    const portColor = parseInt(port.port) < 1024 ? chalk.hex("#FF6B6B") : chalk.white;

    table.push([
      protoColor(port.protocol),
      portColor(port.port),
      chalk.gray(port.address),
      chalk.hex("#45B7D1")(port.pid),
      chalk.white(port.process.substring(0, 20))
    ]);
  }

  return table;
}

async function displayPortsList() {
  const spinner = criarSpinner("Scanning ports...");
  spinner.start();

  try {
    const ports = await listarPortas();
    spinner.stop();

    if (ports.length === 0) {
      console.log(chalk.yellow("\n  No listening ports found.\n"));
      return;
    }

    console.log(chalk.hex("#4ECDC4")(`\n  Found ${chalk.bold(ports.length)} active ports:\n`));

    const table = createPortsTable(ports);
    console.log(table.toString());

    // Legend
    console.log();
    console.log(chalk.gray("  Legend: ") +
      chalk.hex("#FF6B6B")("port < 1024 (privileged)") +
      chalk.gray(" | ") +
      chalk.hex("#4ECDC4")("TCP") +
      chalk.gray(" | ") +
      chalk.hex("#96CEB4")("UDP")
    );

  } catch (error) {
    spinner.fail(chalk.red("Error scanning ports"));
    console.log(chalk.red(`  ${error.message}`));
  }
}

async function killPortMenu() {
  const spinner = criarSpinner("Loading ports...");
  spinner.start();

  try {
    const ports = await listarPortas();
    spinner.stop();

    if (ports.length === 0) {
      console.log(chalk.yellow("\n  No active ports to terminate.\n"));
      return;
    }

    const options = ports.map(p => ({
      name: `${chalk.hex("#4ECDC4")(p.protocol.padEnd(4))} ${chalk.white(`:${p.port}`.padEnd(8))} ${chalk.gray("-")} ${chalk.hex("#96CEB4")(p.process)} ${chalk.gray(`(PID: ${p.pid})`)}`,
      value: p,
      description: `Address: ${p.address}`
    }));

    options.push({
      name: chalk.gray("  Back to menu"),
      value: null,
      description: "Return to main menu"
    });

    const selectedPort = await select({
      message: chalk.hex("#FF6B6B")("Select port to terminate:"),
      choices: options,
      pageSize: 15
    });

    if (!selectedPort) return;

    // Show detailed process info
    const info = await infoProcesso(selectedPort.pid);
    if (info) {
      console.log();
      console.log(chalk.gray("  ┌─ Process Details ──────────────────────────────────────────────"));
      console.log(chalk.gray("  │ ") + chalk.hex("#FFE66D")("PID:     ") + chalk.white(info.pid));
      console.log(chalk.gray("  │ ") + chalk.hex("#FFE66D")("User:    ") + chalk.white(info.user));
      console.log(chalk.gray("  │ ") + chalk.hex("#FFE66D")("Command: ") + chalk.white(info.cmd.substring(0, 50)));
      console.log(chalk.gray("  └──────────────────────────────────────────────────────────────"));
      console.log();
    }

    const confirmed = await confirm({
      message: chalk.hex("#FF6B6B")(`Are you sure you want to kill the process on port ${selectedPort.port}?`),
      default: false
    });

    if (confirmed) {
      const spinnerKill = criarSpinner(`Terminating process on port ${selectedPort.port}...`);
      spinnerKill.start();

      const result = await matarPorta(selectedPort.port);

      if (result.success) {
        spinnerKill.succeed(chalk.green(result.message));
      } else {
        spinnerKill.fail(chalk.red(result.message));
      }
    } else {
      console.log(chalk.gray("\n  Operation cancelled.\n"));
    }

  } catch (error) {
    spinner.stop();
    if (error.name !== "ExitPromptError") {
      console.log(chalk.red(`\n  Error: ${error.message}\n`));
    }
  }
}

async function monitorMode() {
  // Enter alternate screen buffer for clean TUI experience
  process.stdout.write('\x1B[?1049h');
  // Hide cursor to prevent flicker
  process.stdout.write('\x1B[?25l');

  const render = async () => {
    // Move cursor to home position (0,0) instead of clearing
    process.stdout.write('\x1B[H');

    // Build output as a single string
    let output = ASCII_ART;
    output += chalk.gray("─".repeat(75)) + "\n";
    output += chalk.white.bold("  PortWatcher ") +
      chalk.hex("#96CEB4")(`v${VERSION}`) +
      chalk.gray("  |  System Port Monitor") + "\n";
    output += chalk.gray("─".repeat(75)) + "\n\n";
    output += chalk.hex("#FFE66D").bold("  MONITOR MODE") + chalk.gray(" (updates every 2s) | Ctrl+C to exit\n\n");

    try {
      const ports = await listarPortas();
      const table = createPortsTable(ports);
      output += table.toString() + "\n";
      output += chalk.gray(`\n  Last update: ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      output += chalk.red(`  Error: ${error.message}`);
    }

    // Clear from cursor to end of screen and write output
    process.stdout.write('\x1B[J');
    process.stdout.write(output);
  };

  // Initial render
  await render();

  const interval = setInterval(render, 2000);

  // Wait for Ctrl+C
  await new Promise((resolve) => {
    const cleanup = () => {
      clearInterval(interval);
      // Show cursor again
      process.stdout.write('\x1B[?25h');
      // Exit alternate screen buffer
      process.stdout.write('\x1B[?1049l');
      resolve();
    };

    process.on("SIGINT", cleanup);
  });
}

async function main() {
  let running = true;

  while (running) {
    displayHeader();

    try {
      const option = await select({
        message: chalk.white("What would you like to do?"),
        choices: MAIN_MENU,
      });

      switch (option) {
        case "exit":
          console.log(chalk.hex("#4ECDC4")("\n  Goodbye! Your ports are safe.\n"));
          running = false;
          break;

        case "list":
          await displayPortsList();
          await pause();
          break;

        case "kill":
          await killPortMenu();
          await pause();
          break;

        case "monitor":
          await monitorMode();
          break;
      }
    } catch (error) {
      if (error.name === "ExitPromptError") {
        console.log(chalk.hex("#4ECDC4")("\n  Goodbye!\n"));
        running = false;
      } else {
        console.log(chalk.red(`\n  Error: ${error.message}\n`));
        await pause();
      }
    }
  }

  process.exit(0);
}

function pause() {
  return new Promise((resolve) => {
    console.log(chalk.gray("\n  Press any key to continue..."));

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.setRawMode(false);
      resolve();
    });
  });
}

main().catch(console.error);
