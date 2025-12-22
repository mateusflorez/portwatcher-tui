import chalk from "chalk";
import { select, confirm } from "@inquirer/prompts";
import Table from "cli-table3";
import { listarPortas, matarPorta, infoProcesso } from "./port-scanner.js";
import { criarSpinner } from "./spinner.js";

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

const MENU_PRINCIPAL = [
  {
    name: chalk.hex("#4ECDC4")("  Listar portas ativas"),
    value: "listar",
    description: "Exibe todas as portas TCP/UDP em escuta"
  },
  {
    name: chalk.hex("#FF6B6B")("  Matar processo por porta"),
    value: "matar",
    description: "Encerra um processo que esta usando uma porta especifica"
  },
  {
    name: chalk.hex("#FFE66D")("  Refresh automatico"),
    value: "refresh",
    description: "Monitora portas em tempo real"
  },
  {
    name: chalk.red("  Sair"),
    value: "sair",
    description: "Encerra o programa"
  },
];

function exibirHeader() {
  console.clear();
  console.log(ASCII_ART);
  console.log(chalk.gray("─".repeat(75)));
  console.log(
    chalk.white.bold("  PortWatcher ") +
    chalk.hex("#96CEB4")("v1.0.0") +
    chalk.gray("  |  Monitor de Portas do Sistema")
  );
  console.log(chalk.gray("─".repeat(75)));
  console.log();
}

function criarTabelaPortas(portas) {
  const table = new Table({
    head: [
      chalk.hex("#FFE66D").bold("PROTO"),
      chalk.hex("#FFE66D").bold("PORTA"),
      chalk.hex("#FFE66D").bold("ENDERECO"),
      chalk.hex("#FFE66D").bold("PID"),
      chalk.hex("#FFE66D").bold("PROCESSO")
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

  for (const porta of portas) {
    const protoColor = porta.protocol === "TCP" ? chalk.hex("#4ECDC4") : chalk.hex("#96CEB4");
    const portColor = parseInt(porta.port) < 1024 ? chalk.hex("#FF6B6B") : chalk.white;

    table.push([
      protoColor(porta.protocol),
      portColor(porta.port),
      chalk.gray(porta.address),
      chalk.hex("#45B7D1")(porta.pid),
      chalk.white(porta.process.substring(0, 20))
    ]);
  }

  return table;
}

async function exibirListaPortas() {
  const spinner = criarSpinner("Escaneando portas...");
  spinner.start();

  try {
    const portas = await listarPortas();
    spinner.stop();

    if (portas.length === 0) {
      console.log(chalk.yellow("\n  Nenhuma porta em escuta encontrada.\n"));
      return;
    }

    console.log(chalk.hex("#4ECDC4")(`\n  Encontradas ${chalk.bold(portas.length)} portas ativas:\n`));

    const tabela = criarTabelaPortas(portas);
    console.log(tabela.toString());

    // Legenda
    console.log();
    console.log(chalk.gray("  Legenda: ") +
      chalk.hex("#FF6B6B")("porta < 1024 (privilegiada)") +
      chalk.gray(" | ") +
      chalk.hex("#4ECDC4")("TCP") +
      chalk.gray(" | ") +
      chalk.hex("#96CEB4")("UDP")
    );

  } catch (error) {
    spinner.fail(chalk.red("Erro ao escanear portas"));
    console.log(chalk.red(`  ${error.message}`));
  }
}

async function menuMatarPorta() {
  const spinner = criarSpinner("Carregando portas...");
  spinner.start();

  try {
    const portas = await listarPortas();
    spinner.stop();

    if (portas.length === 0) {
      console.log(chalk.yellow("\n  Nenhuma porta ativa para encerrar.\n"));
      return;
    }

    const opcoes = portas.map(p => ({
      name: `${chalk.hex("#4ECDC4")(p.protocol.padEnd(4))} ${chalk.white(`:${p.port}`.padEnd(8))} ${chalk.gray("-")} ${chalk.hex("#96CEB4")(p.process)} ${chalk.gray(`(PID: ${p.pid})`)}`,
      value: p,
      description: `Endereco: ${p.address}`
    }));

    opcoes.push({
      name: chalk.gray("  Voltar ao menu"),
      value: null,
      description: "Retorna ao menu principal"
    });

    const portaSelecionada = await select({
      message: chalk.hex("#FF6B6B")("Selecione a porta para encerrar:"),
      choices: opcoes,
      pageSize: 15
    });

    if (!portaSelecionada) return;

    // Mostra info detalhada do processo
    const info = await infoProcesso(portaSelecionada.pid);
    if (info) {
      console.log();
      console.log(chalk.gray("  ┌─ Detalhes do Processo ────────────────────────────────────────"));
      console.log(chalk.gray("  │ ") + chalk.hex("#FFE66D")("PID:     ") + chalk.white(info.pid));
      console.log(chalk.gray("  │ ") + chalk.hex("#FFE66D")("Usuario: ") + chalk.white(info.user));
      console.log(chalk.gray("  │ ") + chalk.hex("#FFE66D")("Comando: ") + chalk.white(info.cmd.substring(0, 50)));
      console.log(chalk.gray("  └──────────────────────────────────────────────────────────────"));
      console.log();
    }

    const confirma = await confirm({
      message: chalk.hex("#FF6B6B")(`Tem certeza que deseja matar o processo na porta ${portaSelecionada.port}?`),
      default: false
    });

    if (confirma) {
      const spinnerKill = criarSpinner(`Encerrando processo na porta ${portaSelecionada.port}...`);
      spinnerKill.start();

      const resultado = await matarPorta(portaSelecionada.port);

      if (resultado.success) {
        spinnerKill.succeed(chalk.green(resultado.message));
      } else {
        spinnerKill.fail(chalk.red(resultado.message));
      }
    } else {
      console.log(chalk.gray("\n  Operacao cancelada.\n"));
    }

  } catch (error) {
    spinner.stop();
    if (error.name !== "ExitPromptError") {
      console.log(chalk.red(`\n  Erro: ${error.message}\n`));
    }
  }
}

async function monitorRefresh() {
  console.log(chalk.hex("#FFE66D")("\n  Modo monitor ativado. Pressione Ctrl+C para sair.\n"));

  const intervalo = setInterval(async () => {
    console.clear();
    exibirHeader();
    console.log(chalk.hex("#FFE66D").bold("  MODO MONITOR") + chalk.gray(" (atualiza a cada 2s) | Ctrl+C para sair\n"));

    try {
      const portas = await listarPortas();
      const tabela = criarTabelaPortas(portas);
      console.log(tabela.toString());
      console.log(chalk.gray(`\n  Ultima atualizacao: ${new Date().toLocaleTimeString()}`));
    } catch (error) {
      console.log(chalk.red(`  Erro: ${error.message}`));
    }
  }, 2000);

  // Aguarda Ctrl+C
  await new Promise((resolve) => {
    process.on("SIGINT", () => {
      clearInterval(intervalo);
      resolve();
    });
  });
}

async function main() {
  let rodando = true;

  while (rodando) {
    exibirHeader();

    try {
      const opcao = await select({
        message: chalk.white("O que deseja fazer?"),
        choices: MENU_PRINCIPAL,
      });

      switch (opcao) {
        case "sair":
          console.log(chalk.hex("#4ECDC4")("\n  Ate mais! Portas seguras por aqui.\n"));
          rodando = false;
          break;

        case "listar":
          await exibirListaPortas();
          await pausar();
          break;

        case "matar":
          await menuMatarPorta();
          await pausar();
          break;

        case "refresh":
          await monitorRefresh();
          break;
      }
    } catch (error) {
      if (error.name === "ExitPromptError") {
        console.log(chalk.hex("#4ECDC4")("\n  Ate mais!\n"));
        rodando = false;
      } else {
        console.log(chalk.red(`\n  Erro: ${error.message}\n`));
        await pausar();
      }
    }
  }

  process.exit(0);
}

function pausar() {
  return new Promise((resolve) => {
    console.log(chalk.gray("\n  Pressione qualquer tecla para continuar..."));

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.setRawMode(false);
      resolve();
    });
  });
}

main().catch(console.error);
