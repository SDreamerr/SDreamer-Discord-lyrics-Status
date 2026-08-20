import { execSync } from 'child_process';

export async function getSpotifyCurrentTrack() {
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

    // ВАЖНО: Очищаем строки от невидимых символов \n, \r и лишних пробелов по краям
    title = title.replace(/[\r\n]+/g, " ").trim();
    artist = artist.replace(/[\r\n]+/g, " ").trim();

    if (!artist || artist === "") artist = "Spotify";
    const trackId = Buffer.from(`${artist}-${title}`).toString('hex').substring(0, 16);

    if (!title) return null;

    return {
      title,
      artist,
      progressSec: progressSec || 0,
      trackId
    };
  } catch (error) {
    return null;
  }
}
