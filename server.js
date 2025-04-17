import express from 'express';
import fetch from 'node-fetch';
import { URL } from 'url';
import { AbortController } from 'abort-controller'; // Import AbortController

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Fetches data with a timeout to avoid hanging indefinitely.
 * @param {string} url - The URL to fetch.
 * @param {Object} headers - The headers to forward from the incoming request.
 * @param {number} timeout - Timeout for the request in milliseconds.
 */
const fetchWithTimeout = async (url, headers = {}, timeout = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'GET', // Default GET method
      headers: headers, // Forward headers from incoming request
      signal: controller.signal
    });
    clearTimeout(timeoutId); // Clear timeout if request is successful
    return response;
  } catch (error) {
    clearTimeout(timeoutId); // Ensure timeout is cleared on error
    throw error;
  }
};

/**
 * Recursively rewrites .m3u8 playlists so all segment and playlist URLs are proxied through this server.
 */
const rewritePlaylist = async (originalUrl, reqHeaders) => {
  try {
    const response = await fetchWithTimeout(originalUrl, reqHeaders, 10000); // Pass headers from request
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
  } catch (error) {
    console.error('Error fetching the playlist:', error);
    throw error; // Propagate error
  }
};

// Proxy and rewrite .m3u8 playlists
app.get('/playlist.m3u8', async (req, res) => {
  const originalUrl = req.query.url;
  if (!originalUrl) {
    return res.status(400).send('Missing "url" query parameter');
  }

  try {
    console.log(`Proxying playlist: ${originalUrl}`);

    // Forward the headers from the incoming request to the upstream request
    const rewritten = await rewritePlaylist(originalUrl, req.headers);
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

    // Forward the headers from the incoming request to the upstream request
    const response = await fetchWithTimeout(segmentUrl, req.headers);
    if (!response.ok) throw new Error(`Bad segment response: ${response.status}`);

    res.setHeader('Content-Type', 'video/MP2T');
    response.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error proxying segment');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🎬 HLS proxy server running at http://localhost:${PORT}`);
  console.log(`🔗 Try: /playlist.m3u8?url=https://example.com/yourstream.m3u8`);
});
