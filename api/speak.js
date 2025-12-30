// api/speak.js - Proxy Deepgram TTS với log chi tiết

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, model = 'aura-2-thalia-en' } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Text is required' });
  }

  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  console.log('DEEPGRAM_API_KEY exists:', !!DEEPGRAM_API_KEY);  // Log để check key có load không
  if (!DEEPGRAM_API_KEY) {
    console.error('Missing DEEPGRAM_API_KEY');
    return res.status(500).json({ error: 'Server config error: missing API key' });
  }

  try {
    const deepgramUrl = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`;
    console.log('Calling Deepgram:', deepgramUrl, 'Text length:', text.trim().length);

    const response = await fetch(deepgramUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: text.trim() })
    });

    console.log('Deepgram response status:', response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error('Deepgram error response:', errText);
      return res.status(response.status).json({ 
        error: 'Deepgram API error', 
        status: response.status,
        details: errText 
      });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    response.body.pipe(res);

  } catch (error) {
    console.error('Unexpected proxy error:', error.message || error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message || 'Unknown' 
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  }
};
