import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getSimliToken(faceId) {
  const response = await fetch('https://api.simli.ai/compose/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-simli-api-key': process.env.SIMLI_API_KEY,
    },
    body: JSON.stringify({
      faceId,
      handleSilence: true,
      maxSessionLength: 600,
      maxIdleTime: 300,
    }),
  });
  const data = await response.json();
  return data.session_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { user_message, is_start, conversation_history } = req.body;

  try {
    const faceId = process.env.SIMLI_FACE_ID || '0c2b8b04-5274-41f1-a21c-d5c98322efa9';

    // トークンとAI応答を並列で取得
    const [sessionToken, completion] = await Promise.all([
      getSimliToken(faceId),
      openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: is_start ? [
          { role: 'system', content: 'あなたは転職支援会社のプロフェッショナルな面接官AIです。やや厳格でプロフェッショナルなトーンで話してください。最初に「本日はよろしくお願いします。まず、お名前をお聞かせください。」とだけ言ってください。日本語のみ。' },
          { role: 'user', content: '開始' }
        ] : [
          { role: 'system', content: 'あなたは転職支援会社のプロフェッショナルな面接官AIです。やや厳格でプロフェッショナルなトーンで話してください。日本語のみ。2文以内で簡潔に。' },
          ...(conversation_history || []),
          { role: 'user', content: user_message }
        ],
        max_tokens: 150,
        temperature: 0.7,
      })
    ]);

    const aiText = completion.choices[0].message.content;

    // ElevenLabsでPCM16音声生成
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=pcm_16000`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: aiText,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.6, similarity_boost: 0.8 }
        }),
      }
    );

    const audioBuffer = await elevenResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    return res.status(200).json({
      ai_text: aiText,
      audio_base64: audioBase64,
      session_token: sessionToken,
      face_id: faceId,
      simli_api_key: process.env.SIMLI_API_KEY,
    });

  } catch (error) {
    console.error('Video session error:', error);
    return res.status(500).json({ message: error.message });
  }
}
