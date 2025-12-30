// api/speak.js - Proxy Deepgram TTS tương thích Vercel Node.js mới

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
    return res.status(500).json({ error: 'Missing DEEPGRAM_API_KEY in environment' });
  }

  try {
    const deepgramResponse = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: text.trim() })
    });

    if (!deepgramResponse.ok) {
      const errText = await deepgramResponse.text();
      return res.status(deepgramResponse.status).json({ 
        error: 'Deepgram API error', 
        details: errText 
      });
    }

    // Fix lỗi pipe: Đọc stream và forward về client
    if (!deepgramResponse.body) {
      return res.status(500).json({ error: 'No response body from Deepgram' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    // Dùng ReadableStream để pipe đúng cách trên Vercel
    const reader = deepgramResponse.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(value);
      await pump();
    };
    await pump();

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}

// Không cần bodyParser vì chúng ta stream
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  }
};
