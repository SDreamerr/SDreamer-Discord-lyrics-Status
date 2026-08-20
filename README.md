# Discord Lyrics Status

![Node.js](https://img.shields.io/badge/Node.js-24-green)
![Platform](https://img.shields.io/badge/platform-NixOS-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

A Node.js app that displays the currently playing lyric line as your Discord status — synced in real time with whatever song you're listening to. Built and tested on NixOS.

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
  - [NixOS](#nixos)
  - [Manual (npm)](#manual-npm)
- [Configuration](#configuration)
- [Usage](#usage)
- [License](#license)

## Requirements

- Node.js `>= 24`
- npm
- A Discord account (and token, if using a bot/user client)

## Installation

### NixOS

A `shell.nix` is included in the repo:

```nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs_24
  ];

  shellHook = ''
    echo "=========================================="
    echo "0.0.1"
    echo "Launch \"node index.js\""
    echo "=========================================="
  '';
}
```

Then just run:

```bash
nix-shell
```

### Manual (npm)

```bash
git clone https://github.com/your-username/discord-lyrics-status.git
cd discord-lyrics-status
npm install
```

## Usage

```bash
node index.js
```

## License

Distributed under the [MIT License](LICENSE).
