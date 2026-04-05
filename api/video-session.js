import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

  const { user_message, is_start, conversation_history, candidate_id } = req.body;

  try {
    const faceId = process.env.SIMLI_FACE_ID || '0c2b8b04-5274-41f1-a21c-d5c98322efa9';

    // 候補者情報をDBから取得
    let candidateContext = '';
    let candidateName = '';
    if (candidate_id) {
      const { data: candidate } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', candidate_id)
        .single();

      if (candidate) {
        candidateName = candidate.candidate_name || '';
        const parsed = candidate.candidate_parsed_info || {};
        candidateContext = `
候補者情報：
・氏名：${candidateName}
・年齢：${parsed.age || '不明'}
・現職：${parsed.current_job || '不明'}
・希望職種：${parsed.desired_job || '不明'}
・スキル：${parsed.skills || '不明'}
・職務経歴：${parsed.experience || '不明'}
・学歴：${parsed.education || '不明'}
・履歴書全文：${candidate.candidate_resume_text?.slice(0, 800) || 'なし'}`;
      }
    }

    const systemPrompt = `あなたは転職支援会社のプロフェッショナルな面接官AIです。やや厳格でプロフェッショナルなトーンで話してください。日本語のみ。2文以内で簡潔に。
${candidateContext}

重要：候補者の名前や経歴は既に把握しています。名前を聞いたり、既知の情報を再度確認する必要はありません。履歴書の内容を踏まえた質問をしてください。`;

    const [sessionToken, completion] = await Promise.all([
      getSimliToken(faceId),
      openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: is_start ? [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `面談を開始してください。${candidateName ? `候補者は${candidateName}さんです。` : ''}` }
        ] : [
          { role: 'system', content: systemPrompt },
          ...(conversation_history || []),
          { role: 'user', content: user_message }
        ],
        max_tokens: 150,
        temperature: 0.7,
      })
    ]);

    const aiText = completion.choices[0].message.content;

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
