// api/speak.js - Proxy bảo mật cho Deepgram TTS

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Chỉ hỗ trợ phương thức POST' });
    return;
  }

  const { text, model = 'aura-2-thalia-en' } = req.body;

  if (!text || text.trim() === '') {
    res.status(400).json({ error: 'Vui lòng nhập text để chuyển giọng' });
    return;
  }

  if (text.length > 50000) {
    res.status(400).json({ error: 'Text quá dài (tối đa 50.000 ký tự)' });
    return;
  }

  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  if (!DEEPGRAM_API_KEY) {
    console.error('Lỗi: Chưa thiết lập DEEPGRAM_API_KEY');
    res.status(500).json({ error: 'Lỗi cấu hình server' });
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
      console.error('Lỗi từ Deepgram:', err);
      res.status(response.status).json({ error: 'Lỗi Deepgram API', details: err });
      return;
    }

    // Stream audio trực tiếp về trình duyệt
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    response.body.pipe(res);

  } catch (error) {
    console.error('Lỗi proxy:', error);
    res.status(500).json({ error: 'Lỗi nội bộ server' });
  }
}

// Cấu hình quan trọng để Vercel hỗ trợ streaming
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  }
};
