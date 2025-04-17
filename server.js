const express = require('express');
const { spawn } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/stream.flac', (req, res) => {
  const inputUrl = req.query.url;

  if (!inputUrl) {
    res.status(400).send('Missing "url" query parameter');
    return;
  }

  console.log(`Client connected, starting ffmpeg for URL: ${inputUrl}`);

  // Set correct content type
  res.setHeader('Content-Type', 'audio/flac');

  const ffmpeg = spawn('ffmpeg', [
    '-re',
    '-i', inputUrl,
    '-vn',
    '-acodec', 'flac',
    '-f', 'flac',
    '-bufsize', '2M',          // output buffer size
    '-flush_packets', '0', 
    'pipe:1'
  ]);

  // Pipe output to client
  ffmpeg.stdout.pipe(res);

  // Log any ffmpeg errors
  ffmpeg.stderr.on('data', (data) => {
    console.error(`[ffmpeg] ${data}`);
  });

  // Kill ffmpeg if client disconnects
  const cleanup = () => {
    console.log('Client disconnected or ffmpeg exited.');
    ffmpeg.kill('SIGKILL');
  };

  req.on('close', cleanup);
  ffmpeg.on('exit', cleanup);
});

app.listen(PORT, () => {
  console.log(`FLAC proxy running at http://localhost:${PORT}/stream.flac?url=<HLS_URL>`);
});
