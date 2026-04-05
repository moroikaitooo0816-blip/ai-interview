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

    // 面談設定を取得
    let questionsContext = '';
    let toneContext = 'やや厳格でプロフェッショナル';
    const toneMap = {
      'strict': '厳格で威圧感のある緊張した雰囲気。短く鋭い質問で候補者にプレッシャーを与える。',
      'standard': 'プロフェッショナルで落ち着いた雰囲気。丁寧だが堅い口調。',
      'friendly': '親しみやすくフレンドリーな雰囲気。明るく話しやすい口調で候補者をリラックスさせる。',
    };
    const { data: settings } = await supabase
      .from('interview_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    if (settings && settings[0]) {
      if (settings[0].questions?.length > 0) {
        questionsContext = '\n面談で必ず聞く質問（順番に聞いてください）：\n' + settings[0].questions.map((q, i) => (i+1) + '. ' + (q.text || q)).join('\n');
      }
      if (settings[0].tone) toneContext = toneMap[settings[0].tone] || settings[0].tone;
    }

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

    // 既に聞いた質問を抽出
const askedQuestions = (conversation_history || [])
  .filter(m => m.role === 'assistant')
  .map(m => m.content);

const systemPrompt = `あなたは転職支援会社のプロフェッショナルな面接官AIです。トーン：${toneContext}。日本語のみ。2文以内で簡潔に。
${candidateContext}

【厳守ルール】
- 以下の質問リストを上から順番に1つずつ聞いてください
- 候補者が回答したら「ありがとうございます」と一言添えて次の質問に進んでください
- 既に聞いた質問は絶対に繰り返さないでください
- リスト以外の質問はしないでください
- 候補者の名前や経歴は把握済みなので確認不要です

${questionsContext || '質問リストがありません。'}

既に聞いた質問数：${askedQuestions.length}件（次はリストの${askedQuestions.length + 1}番目を聞いてください）`;

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
