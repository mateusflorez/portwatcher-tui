import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Lista todas as portas TCP/UDP em escuta
 * @returns {Promise<Array<{protocol: string, port: string, pid: string, process: string, address: string}>>}
 */
export async function listarPortas() {
  try {
    // Usando ss (socket statistics) - mais moderno que netstat
    const { stdout } = await execAsync("ss -tulnp 2>/dev/null || netstat -tulnp 2>/dev/null");

    const linhas = stdout.split("\n").filter(Boolean);
    const portas = [];

    for (const linha of linhas) {
      // Pula header
      if (linha.includes("State") || linha.includes("Proto") || linha.includes("Netid")) {
        continue;
      }

      const parsed = parseLinhaSS(linha) || parseLinhaNetstat(linha);
      if (parsed && parsed.port) {
        portas.push(parsed);
      }
    }

    // Remove duplicatas por porta
    const seen = new Set();
    return portas.filter(p => {
      const key = `${p.protocol}:${p.port}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => parseInt(a.port) - parseInt(b.port));

  } catch (error) {
    throw new Error(`Falha ao listar portas: ${error.message}`);
  }
}

/**
 * Parse linha do comando ss
 */
function parseLinhaSS(linha) {
  // Formato ss: tcp   LISTEN  0  128  0.0.0.0:3000  0.0.0.0:*  users:(("node",pid=1234,fd=21))
  const match = linha.match(/^(tcp|udp)\s+\w+\s+\d+\s+\d+\s+(\S+):(\d+)\s+\S+\s*(.*)$/);

  if (match) {
    const [, protocol, address, port, extras] = match;
    const pidMatch = extras.match(/pid=(\d+)/);
    const processMatch = extras.match(/\("([^"]+)"/);

    return {
      protocol: protocol.toUpperCase(),
      address: address === "0.0.0.0" || address === "*" ? "0.0.0.0" : address,
      port,
      pid: pidMatch ? pidMatch[1] : "-",
      process: processMatch ? processMatch[1] : "-"
    };
  }

  return null;
}

/**
 * Parse linha do comando netstat
 */
function parseLinhaNetstat(linha) {
  // Formato netstat: tcp  0  0  0.0.0.0:3000  0.0.0.0:*  LISTEN  1234/node
  const match = linha.match(/^(tcp|udp)\d?\s+\d+\s+\d+\s+(\S+):(\d+)\s+\S+\s+\w*\s*(\d+)?\/?([\w-]*)?/);

  if (match) {
    const [, protocol, address, port, pid, process] = match;

    return {
      protocol: protocol.toUpperCase(),
      address: address === "0.0.0.0" || address === "*" ? "0.0.0.0" : address,
      port,
      pid: pid || "-",
      process: process || "-"
    };
  }

  return null;
}

/**
 * Mata um processo pela porta
 * @param {string} port - Porta a ser liberada
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function matarPorta(port) {
  try {
    // Primeiro, encontra o PID do processo usando a porta
    const { stdout } = await execAsync(`lsof -t -i:${port} 2>/dev/null || fuser ${port}/tcp 2>/dev/null`);

    const pids = stdout.trim().split(/\s+/).filter(Boolean);

    if (pids.length === 0) {
      return { success: false, message: `Nenhum processo encontrado na porta ${port}` };
    }

    // Mata todos os processos encontrados
    for (const pid of pids) {
      await execAsync(`kill -9 ${pid}`);
    }

    return {
      success: true,
      message: `Porta ${port} liberada com sucesso (PID: ${pids.join(", ")})`
    };

  } catch (error) {
    // Tenta com sudo se falhar
    if (error.message.includes("permission") || error.message.includes("Operation not permitted")) {
      return {
        success: false,
        message: `Sem permissao para matar processo na porta ${port}. Tente executar com sudo.`
      };
    }

    return { success: false, message: `Erro ao liberar porta: ${error.message}` };
  }
}

/**
 * Obtém informações detalhadas de um processo pelo PID
 */
export async function infoProcesso(pid) {
  try {
    if (!pid || pid === "-") return null;

    const { stdout } = await execAsync(`ps -p ${pid} -o pid,user,cmd --no-headers 2>/dev/null`);
    const parts = stdout.trim().split(/\s+/);

    return {
      pid: parts[0],
      user: parts[1],
      cmd: parts.slice(2).join(" ")
    };
  } catch {
    return null;
  }
}
