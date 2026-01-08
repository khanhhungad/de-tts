// api/speak.js - WebSocket Streaming TTS Proxy (prosody consistent for long text)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, model = 'aura-2-thalia-en' } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Text is required' });
  }

  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  if (!DEEPGRAM_API_KEY) {
    return res.status(500).json({ error: 'Missing API key' });
  }

  try {
    // Kết nối WebSocket Deepgram
    const wsUrl = `wss://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=linear16`;
    const ws = new WebSocket(wsUrl, ['token', DEEPGRAM_API_KEY]);

    ws.on('open', () => {
      // Chia text theo câu (tối ưu prosody)
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      sentences.forEach((sentence, index) => {
        const message = { type: 'Speak', text: sentence.trim() };
        ws.send(JSON.stringify(message));
        if (index === sentences.length - 1) {
          ws.send(JSON.stringify({ type: 'Flush' }));  // Finalize stream
        }
      });
    });

    res.setHeader('Content-Type', 'audio/wav');  // Hoặc mp3 nếu config encoding=mp3
    res.setHeader('Cache-Control', 'no-cache');

    ws.on('message', (data) => {
      res.write(data);  // Stream audio byte trực tiếp về client
    });

    ws.on('close', () => {
      res.end();
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      res.status(500).json({ error: 'TTS stream error' });
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  }
};
