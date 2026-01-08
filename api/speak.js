// api/speak.js - Proxy Deepgram TTS ổn định cho Vercel (REST API)

export default async function handler(req, res) {
  // Chỉ chấp nhận POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, model = 'aura-2-thalia-en' } = req.body;

  // Validate text
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'Text is required and must be a non-empty string' });
  }

  if (text.trim().length > 2000) {
    return res.status(400).json({ error: 'Text exceeds 2000 character limit' });
  }

  // Lấy API key từ Environment Variables (ẩn hoàn toàn)
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  if (!DEEPGRAM_API_KEY) {
    console.error('DEEPGRAM_API_KEY is not set in environment');
    return res.status(500).json({ error: 'Server configuration error: missing API key' });
  }

  try {
    const deepgramUrl = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`;

    const deepgramResponse = await fetch(deepgramUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: text.trim() })
    });

    // Kiểm tra lỗi từ Deepgram
    if (!deepgramResponse.ok) {
      const errorDetails = await deepgramResponse.text();
      console.error('Deepgram API error:', deepgramResponse.status, errorDetails);
      return res.status(deepgramResponse.status).json({
        error: 'Deepgram API error',
        details: errorDetails
      });
    }

    // Forward audio stream về client (fix pipe error trên Vercel mới)
    if (!deepgramResponse.body) {
      return res.status(500).json({ error: 'No audio stream received from Deepgram' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    // Dùng reader để đọc và write stream (tương thích Vercel Node.js runtime)
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
    console.error('Unexpected error in speak.js proxy:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message || 'Unknown error'
    });
  }
}

// Cấu hình quan trọng cho Vercel
export const config = {
  api: {
    bodyParser: false,     // Bắt buộc để stream
    responseLimit: false   // Cho phép response lớn
  }
};
