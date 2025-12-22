# PortWatcher

[![npm version](https://img.shields.io/npm/v/portwatcher.svg)](https://www.npmjs.com/package/portwatcher)
[![GitHub](https://img.shields.io/github/stars/mateusflorez/portwatcher-tui?style=social)](https://github.com/mateusflorez/portwatcher-tui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A terminal UI for monitoring and managing active ports on Linux systems.

```
  ╔══════════════════════════════════════════════════════════════════╗
  ║    ____            __  _       __      __       __               ║
  ║   / __ \____  ____/ /_| |     / /___ _/ /______/ /_  ___  _____  ║
  ║  / /_/ / __ \/ __/ __/| | /| / / __ `/ __/ ___/ __ \/ _ \/ ___/  ║
  ║ / ____/ /_/ / / / /_  | |/ |/ / /_/ / /_/ /__/ / / /  __/ /      ║
  ║/_/    \____/_/  \__/  |__/|__/\__,_/\__/\___/_/ /_/\___/_/       ║
  ╚══════════════════════════════════════════════════════════════════╝
```

## Features

- **List active ports** - Display all listening TCP/UDP ports
- **Kill process by port** - Terminate processes using a specific port
- **Real-time monitor** - Auto-refresh every 2 seconds

## Installation

```bash
npm install -g portwatcher
```

## Usage

```bash
portwatcher
```

### Permissions

To see all processes and kill privileged ports (< 1024), run with `sudo`:

```bash
sudo portwatcher
```

## Requirements

- Node.js 18+
- Linux (uses `ss`, `netstat`, `lsof`, `fuser`)

## License

MIT
