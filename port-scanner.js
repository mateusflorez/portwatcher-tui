import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Lists all listening TCP/UDP ports
 * @returns {Promise<Array<{protocol: string, port: string, pid: string, process: string, address: string}>>}
 */
export async function listarPortas() {
  try {
    // Using ss (socket statistics) - more modern than netstat
    const { stdout } = await execAsync("ss -tulnp 2>/dev/null || netstat -tulnp 2>/dev/null");

    const lines = stdout.split("\n").filter(Boolean);
    const ports = [];

    for (const line of lines) {
      // Skip header
      if (line.includes("State") || line.includes("Proto") || line.includes("Netid")) {
        continue;
      }

      const parsed = parseSSLine(line) || parseNetstatLine(line);
      if (parsed && parsed.port) {
        ports.push(parsed);
      }
    }

    // Remove duplicates by port
    const seen = new Set();
    return ports.filter(p => {
      const key = `${p.protocol}:${p.port}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => parseInt(a.port) - parseInt(b.port));

  } catch (error) {
    throw new Error(`Failed to list ports: ${error.message}`);
  }
}

/**
 * Parse ss command output line
 */
function parseSSLine(line) {
  // ss format: tcp   LISTEN  0  128  0.0.0.0:3000  0.0.0.0:*  users:(("node",pid=1234,fd=21))
  const match = line.match(/^(tcp|udp)\s+\w+\s+\d+\s+\d+\s+(\S+):(\d+)\s+\S+\s*(.*)$/);

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
 * Parse netstat command output line
 */
function parseNetstatLine(line) {
  // netstat format: tcp  0  0  0.0.0.0:3000  0.0.0.0:*  LISTEN  1234/node
  const match = line.match(/^(tcp|udp)\d?\s+\d+\s+\d+\s+(\S+):(\d+)\s+\S+\s+\w*\s*(\d+)?\/?([\w-]*)?/);

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
 * Kills a process by port
 * @param {string} port - Port to be released
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function matarPorta(port) {
  try {
    // First, find the PID of the process using the port
    const { stdout } = await execAsync(`lsof -t -i:${port} 2>/dev/null || fuser ${port}/tcp 2>/dev/null`);

    const pids = stdout.trim().split(/\s+/).filter(Boolean);

    if (pids.length === 0) {
      return { success: false, message: `No process found on port ${port}` };
    }

    // Kill all found processes
    for (const pid of pids) {
      await execAsync(`kill -9 ${pid}`);
    }

    return {
      success: true,
      message: `Port ${port} released successfully (PID: ${pids.join(", ")})`
    };

  } catch (error) {
    // Try with sudo if failed
    if (error.message.includes("permission") || error.message.includes("Operation not permitted")) {
      return {
        success: false,
        message: `No permission to kill process on port ${port}. Try running with sudo.`
      };
    }

    return { success: false, message: `Error releasing port: ${error.message}` };
  }
}

/**
 * Gets detailed process information by PID
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
