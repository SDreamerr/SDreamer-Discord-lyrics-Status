import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DISCORD_TOKEN = "F12 -> Storage -> Local Storage -> token";
const MIN_UPDATE_INTERVAL = 4500;
const CACHE_DIR = './lyrics_cache';

const LRCLIB_USER_AGENT = "DiscordSpotifyKaraokeSelfbot/1.0.0 (https://github.com)";

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

let lastTrackId = "";
let lastLine = "";
let lastUpdateTime = 0;
let currentLyrics = [];

function getSpotifyCurrentTrack() {
  try {
    const listBus = execSync('qdbus', { encoding: 'utf-8' });
    const firefoxBusName = listBus.split('\n').find(name => name.includes('org.mpris.MediaPlayer2.firefox'));

    if (!firefoxBusName) return null;

    const playbackStatus = execSync(`qdbus ${firefoxBusName} /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get org.mpris.MediaPlayer2.Player PlaybackStatus`, { encoding: 'utf-8' }).trim();
    if (playbackStatus !== 'Playing') return null;

    const positionMicro = execSync(`qdbus ${firefoxBusName} /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get org.mpris.MediaPlayer2.Player Position`, { encoding: 'utf-8' }).trim();
    const progressSec = Math.floor(parseInt(positionMicro, 10) / 1000000);

    let title = execSync(`qdbus ${firefoxBusName} /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get org.mpris.MediaPlayer2.Player Metadata | grep 'xesam:title:' | cut -d' ' -f2-`, { encoding: 'utf-8' }).trim().replace(' — Spotify', '');
    let artist = execSync(`qdbus ${firefoxBusName} /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get org.mpris.MediaPlayer2.Player Metadata | grep 'xesam:artist:' | cut -d' ' -f2-`, { encoding: 'utf-8' }).trim();

    title = title.replace(/[\r\n\t\x00-\x1F\x7F]+/g, " ").replace(/\s+/g, " ").trim();
    artist = artist.replace(/[\r\n\t\x00-\x1F\x7F]+/g, " ").replace(/\s+/g, " ").trim();

    if (!artist || artist === "") artist = "Spotify";
    const trackId = Buffer.from(`${artist}-${title}`).toString('hex').substring(0, 16);

    if (!title) return null;

    return { title, artist, progressSec: progressSec || 0, trackId };
  } catch (error) {
    return null;
  }
}

function parseLrc(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split(/\r?\n/);
  const lyrics = [];
  const regex = /^\[(\d+):(\d+)(?:\.(\d+))?\]\s*(.*)/;

  for (const line of lines) {
    const match = line.trim().match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const text = match[4] ? match[4].trim() : '';
      const totalSeconds = minutes * 60 + seconds;

      if (text && !text.startsWith('[') && !text.endsWith(']')) {
        lyrics.push({ time: totalSeconds, text });
      }
    }
  }
  return lyrics.sort((a, b) => a.time - b.time);
}

function getLyrics(artist, title, trackId) {
  return new Promise((resolve) => {
    const filePath = path.join(CACHE_DIR, `${trackId}.lrc`);

    if (fs.existsSync(filePath)) {
      return resolve(parseLrc(fs.readFileSync(filePath, 'utf-8')));
    }

    const pathUrl = `/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;

    const options = {
      hostname: 'lrclib.net',
      port: 443,
      path: pathUrl,
      method: 'GET',
      headers: {
        'User-Agent': LRCLIB_USER_AGENT
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const data = JSON.parse(rawData);
            if (Array.isArray(data) && data.length > 0) {
              const matchedTrack = data.find(track => track.syncedLyrics);
              if (matchedTrack && matchedTrack.syncedLyrics) {
                fs.writeFileSync(filePath, matchedTrack.syncedLyrics, 'utf-8');
                console.log(`[INFO] lyrics saved on disk: ${filePath}`);
                return resolve(parseLrc(matchedTrack.syncedLyrics));
              }
            }
          }
          resolve([]);
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => {
      resolve([]);
    });
    req.end();
  });
}

function getFixedMergedLine(lyrics, currentSec) {
  if (!lyrics || lyrics.length === 0) return null;
  const blocks = [];
  let i = 0;

  while (i < lyrics.length) {
    const curr = lyrics[i];

    if (i + 1 < lyrics.length) {
      const next = lyrics[i + 1];
      const end = (i + 2 < lyrics.length) ? lyrics[i + 2].time : next.time + 6;

      blocks.push({
        start: curr.time,
        end: end,
        text: `${curr.text} | ${next.text}`
      });
      i += 2;
      continue;
    }

    blocks.push({
      start: curr.time,
      end: curr.time + 6,
      text: curr.text
    });
    i++;
  }

  for (const block of blocks) {
    if (currentSec >= block.start && currentSec < block.end) {
      return block.text;
    }
  }
  return null;
}

function updateDiscordStatus(text) {
  const payload = JSON.stringify({ custom_status: text ? { text: text } : null });

  const options = {
    hostname: 'discord.com',
    port: 443,
    path: '/api/v9/users/@me/settings',
    method: 'PATCH',
    headers: {
      'Authorization': DISCORD_TOKEN,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  };

  const req = https.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log(`[Discord API] Status changing: ${text}`);
    }
  });
  req.on('error', () => {});
  req.write(payload);
  req.end();
}

console.log(`==========================================`);
console.log(`0.0.1`);
console.log(`Made by SDreamer`);
console.log(`==========================================`);

setInterval(async () => {
  try {
    const data = getSpotifyCurrentTrack();

    if (data) {
      const { trackId, title, artist, progressSec } = data;
      const trackName = `${artist} - ${title}`;

      if (trackId !== lastTrackId) {
        if (lastTrackId) {
          const oldPath = path.join(CACHE_DIR, `${lastTrackId}.lrc`);
          try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch(e){}
        }
        console.log(`\n[STATUS] Working: ${trackName}`);
        currentLyrics = await getLyrics(artist, title, trackId);
        lastTrackId = trackId;
        lastLine = "";
        lastUpdateTime = 0;
      }

      const currentLine = getFixedMergedLine(currentLyrics, progressSec);
      let statusText = currentLine ? `🎤 ${currentLine}` : `🎵 ${trackName}`;

      if (statusText.length > 127) {
        statusText = statusText.substring(0, 124) + "...";
      }

      const now = Date.now();
      if (statusText !== lastLine && (now - lastUpdateTime >= MIN_UPDATE_INTERVAL)) {
        updateDiscordStatus(statusText);
        lastLine = statusText;
        lastUpdateTime = now;
      }

    } else if (!data && lastTrackId != "") {
      const oldPath = path.join(CACHE_DIR, `${lastTrackId}.lrc`);
      try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch(e){}
      updateDiscordStatus("");
      console.log(`\n[STATUS] Pause. status reseted`);
      lastTrackId = "";
      lastLine = "";
      currentLyrics = [];
      lastUpdateTime = 0;
    }
  } catch (err) {
  }
}, 1000);
