# Discord Lyrics Status

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Platform](https://img.shields.io/badge/platform-NixOS-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

A Node.js app that displays the currently playing lyric line as your Discord status — synced in real time with whatever song you're listening to. Built and tested on NixOS.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
  - [NixOS](#nixos)
  - [Manual (npm)](#manual-npm)
- [Configuration](#configuration)
- [Usage](#usage)
- [License](#license)

## Features

- Automatic detection of the currently playing track
- Fetches lyrics and shows the current line
- Updates your Discord status live as the track plays
- Simple configuration via a `.env` file

## Requirements

- Node.js `>= 18`
- npm
- A Discord account (and token, if using a bot/user client)

## Installation

### NixOS

The easiest way is via `nix-shell` or a `shell.nix`:

\`\`\`nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [ pkgs.nodejs_20 ];
}
\`\`\`

Then:

\`\`\`bash
nix-shell
\`\`\`

### Manual (npm)

\`\`\`bash
git clone https://github.com/your-username/discord-lyrics-status.git
cd discord-lyrics-status
npm install
\`\`\`

## Configuration

1. Copy the example config:

   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. Fill in your values (Discord token, etc.) in \`.env\`.

## Usage

\`\`\`bash
npm start
\`\`\`

## License

Distributed under the [MIT License](LICENSE).
