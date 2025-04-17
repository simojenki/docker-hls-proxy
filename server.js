import express from 'express';
import fetch from 'node-fetch'; // ESM import
import { URL } from 'url';


const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Recursively rewrites .m3u8 playlists so all segment and playlist URLs are proxied through this server.
 */
const rewritePlaylist = async (originalUrl) => {
  const response = await fetch(originalUrl);
  if (!response.ok) throw new Error(`Failed to fetch ${originalUrl}`);
  const text = await response.text();

  const basePath = originalUrl.substring(0, originalUrl.lastIndexOf('/') + 1);
  const lines = text.split('\n');

  const rewrittenLines = await Promise.all(
    lines.map(async (line) => {
      line = line.trim();

      if (line === '' || line.startsWith('#')) {
        return line; // Comment or metadata
      }

      let resolvedUrl;
      try {
        resolvedUrl = new URL(line, basePath).href;
      } catch {
        return line; // Not a URL, skip rewriting
      }

      if (resolvedUrl.includes('.m3u8')) {
        return `/playlist.m3u8?url=${encodeURIComponent(resolvedUrl)}`;
      }

      if (resolvedUrl.includes('.ts')) {
        return `/segment.ts?url=${encodeURIComponent(resolvedUrl)}`;
      }

      return line;
    })
  );

  return rewrittenLines.join('\n');
};

// Proxy and rewrite .m3u8 playlists
app.get('/playlist.m3u8', async (req, res) => {
  const originalUrl = req.query.url;
  if (!originalUrl) {
    return res.status(400).send('Missing "url" query parameter');
  }

  try {
    console.log(`Proxying playlist: ${originalUrl}`);
    const rewritten = await rewritePlaylist(originalUrl);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(rewritten);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error rewriting playlist');
  }
});

// Proxy .ts segment files
app.get('/segment.ts', async (req, res) => {
  const segmentUrl = req.query.url;
  if (!segmentUrl) {
    return res.status(400).send('Missing "url" query parameter');
  }

  try {
    console.log(`Proxying segment: ${segmentUrl}`);
    const response = await fetch(segmentUrl);
    if (!response.ok) throw new Error(`Bad segment response: ${response.status}`);

    res.setHeader('Content-Type', 'video/MP2T');
    response.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error proxying segment');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🎬 HLS proxy server running at http://localhost:${PORT}`);
  console.log(`🔗 Try: /playlist.m3u8?url=https://example.com/yourstream.m3u8`);
});
