import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { user_message, is_start, conversation_history } = req.body;

  try {
    const messages = is_start ? [
      { role: 'system', content: 'あなたは転職支援会社のプロフェッショナルな面接官AIです。やや厳格でプロフェッショナルなトーンで話してください。最初に「本日はよろしくお願いします。まず、お名前をお聞かせください。」と言ってください。日本語のみで話してください。必ず2文以内で簡潔に話してください。' },
      { role: 'user', content: '面談を開始してください。' }
    ] : [
      { role: 'system', content: 'あなたは転職支援会社のプロフェッショナルな面接官AIです。やや厳格でプロフェッショナルなトーンで話してください。日本語のみで話してください。必ず2文以内で簡潔に話してください。' },
      ...(conversation_history || []),
      { role: 'user', content: user_message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages,
      max_tokens: 150,
      temperature: 0.7,
    });

    const aiText = completion.choices[0].message.content;

    // ElevenLabsでPCM16形式（日本語対応モデル）
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
          voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.2 }
        }),
      }
    );

    const audioBuffer = await elevenResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    const faceId = process.env.SIMLI_FACE_ID || '0c2b8b04-5274-41f1-a21c-d5c98322efa9';

    return res.status(200).json({
      ai_text: aiText,
      audio_base64: audioBase64,
      face_id: faceId,
      simli_api_key: process.env.SIMLI_API_KEY,
    });

  } catch (error) {
    console.error('Video session error:', error);
    return res.status(500).json({ message: error.message });
  }
}
