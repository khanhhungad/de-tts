// api/speak.js - Proxy bảo mật Deepgram TTS

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
    return;
  }

  const { text, model = 'aura-2-thalia-en' } = req.body;

  if (!text || text.trim() === '') {
    res.status(400).json({ error: 'Nhập text đi anh!' });
    return;
  }

  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  if (!DEEPGRAM_API_KEY) {
    res.status(500).json({ error: 'Lỗi server config' });
    return;
  }

  try {
    const response = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: text.trim() })
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(response.status).json({ error: 'Lỗi Deepgram', details: err });
      return;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    response.body.pipe(res);

  } catch (error) {
    res.status(500).json({ error: 'Lỗi proxy' });
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  }
};
