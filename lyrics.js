export async function getLyrics(artist, title, trackId) {
  const filePath = path.join(CACHE_DIR, `${trackId}.lrc`);

  if (fs.existsSync(filePath)) {
    return parseLrc(fs.readFileSync(filePath, 'utf-8'));
  }

  const searchQuery = `${artist} ${title}`.replace(/[\r\n]+/g, " ").trim();

  try {
    const url = `https://104.21.31{encodeURIComponent(searchQuery)}`;

    const res = await fetch(url, {
      headers: {
        'Host': 'lrclib.net',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (res.status === 200) {
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const matchedTrack = data.find(track => track.syncedLyrics);

        if (matchedTrack && matchedTrack.syncedLyrics) {
          fs.writeFileSync(filePath, matchedTrack.syncedLyrics, 'utf-8');
          console.log(`[INFO] Lyrics saved on disk: ${filePath}`);
          return parseLrc(matchedTrack.syncedLyrics);
        }
      }
    }
    console.log(`[lrclib.net] Synced lyrics "${searchQuery}" not found.`);
    return [];
  } catch (error) {
    console.log(`[lrclib.net API] Error of taking lyrics from IPv4: ${error.message}`);
    return [];
  }
}
