# PortWatcher

TUI para monitorar e gerenciar portas ativas no sistema Linux.

```
  ╔══════════════════════════════════════════════════════════════════╗
  ║    ____            __  _       __      __       __               ║
  ║   / __ \____  ____/ /_| |     / /___ _/ /______/ /_  ___  _____  ║
  ║  / /_/ / __ \/ __/ __/| | /| / / __ `/ __/ ___/ __ \/ _ \/ ___/  ║
  ║ / ____/ /_/ / / / /_  | |/ |/ / /_/ / /_/ /__/ / / /  __/ /      ║
  ║/_/    \____/_/  \__/  |__/|__/\__,_/\__/\___/_/ /_/\___/_/       ║
  ╚══════════════════════════════════════════════════════════════════╝
```

## Funcionalidades

- **Listar portas ativas** - Exibe todas as portas TCP/UDP em escuta
- **Matar processo por porta** - Encerra processos usando uma porta específica
- **Monitor em tempo real** - Atualização automática a cada 2 segundos

## Requisitos

- Node.js 18+
- Linux (usa `ss`, `netstat`, `lsof`, `fuser`)

## Instalacao

```bash
npm install
```

## Uso

```bash
npm start
```

Ou diretamente:

```bash
node index.js
```

### Permissoes

Para ver todos os processos e encerrar portas privilegiadas (< 1024), execute com `sudo`:

```bash
sudo node index.js
```

## Dependencias

| Pacote | Descricao |
|--------|-----------|
| chalk | Cores no terminal |
| @inquirer/prompts | Menus interativos |
| cli-table3 | Tabelas formatadas |
| ora | Spinners de loading |

## Licenca

MIT
