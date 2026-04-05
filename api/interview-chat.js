import { supabase } from './_db.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TONE_PROMPTS = {
  strict: "やや厳格でプロフェッショナルなトーン。適度な緊張感と選考感を持たせる。",
  standard: "プロフェッショナルで落ち着いたトーン。丁寧かつ中立的に進める。",
  friendly: "親しみやすく話しやすいトーン。候補者がリラックスして話せるよう配慮する。",
};

const DEFAULT_QUESTIONS = [
  { id: "q1", text: "自己紹介をお願いします。", deepening: true },
  { id: "q2", text: "これまでのご経歴についてお聞かせください。", deepening: true },
  { id: "q3", text: "転職をお考えの理由をお聞かせください。", deepening: true },
  { id: "q4", text: "現在の転職活動状況を教えてください。", deepening: false },
  { id: "q5", text: "転職の時期の目安はいつ頃をお考えですか？", deepening: false },
  { id: "q6", text: "現在の年収と希望年収（額面）をお聞かせください。", deepening: false },
  { id: "q7", text: "希望される勤務地を教えてください。", deepening: false },
  { id: "q8", text: "希望される職種または業界を教えてください。", deepening: true },
  { id: "q9", text: "最後に、意気込みや自己PRをお願いします。", deepening: true },
];

function buildSystemPrompt(questions, tone) {
  const toneDesc = TONE_PROMPTS[tone] || TONE_PROMPTS.strict;
  const total = questions.length;
  const questionList = questions.map((q, i) => `${i + 1}. ${q.text}${q.deepening ? "（深掘りあり）" : ""}`).join("\n");
  const summaryTemplate = questions.map(q => `    {"item": "${q.text}", "summary": "要約"}`).join(",\n");
  const scoreTemplate = questions.map(q => `    {"item": "${q.text}", "score": 点数, "comment": "コメント"}`).join(",\n");

  return `あなたは転職支援会社の面接官AIです。トーン：${toneDesc}

【ヒアリング項目（全${total}項目）】
${questionList}

【行動規則】
- 一問一答ではなく自然な会話形式で進める
- 「深掘りあり」の項目では候補者の回答に対して1〜2回の深掘り質問を挟む
- 「深掘りなし」の項目では回答を確認したら次に進む
- ${total}項目すべてを聞き終えたら面談を終了する
- 回答が不十分な場合は追加で聞く
- 面談の最初にまず候補者の名前を確認する

【応答形式】
通常の面談中はJSON形式で応答：
{"type": "question", "message": "面接官としてのメッセージ", "current_item": 現在の項目番号, "is_deepening": true/false}

全項目完了時のみ：
{"type": "complete", "message": "終了メッセージ", "summaries": [${summaryTemplate}], "score": 総合点数, "score_breakdown": [${scoreTemplate}], "overall_comment": "総合コメント"}

必ずJSON形式のみで応答してください。`;
}

async function callLLM(systemPrompt, userPrompt) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  });
  return JSON.parse(completion.choices[0].message.content);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { interview_id, message, is_start } = req.body;

  const { data: settingsRows } = await supabase
    .from('interview_settings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  const settings = settingsRows?.[0];
  const questions = (settings?.questions?.length > 0) ? settings.questions : DEFAULT_QUESTIONS;
  const tone = settings?.tone || 'strict';
  const systemPrompt = buildSystemPrompt(questions, tone);

  const { data: interview, error: fetchError } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', interview_id)
    .single();

  if (fetchError || !interview) return res.status(404).json({ message: 'Interview not found' });

  const messages = interview.messages || [];

  if (is_start) {
    const response = await callLLM(systemPrompt, '面談を開始してください。まず候補者にご挨拶し、お名前を確認してください。');
    const aiMessage = { role: 'assistant', content: response.message, timestamp: new Date().toISOString() };
    await supabase.from('interviews').update({ messages: [...messages, aiMessage] }).eq('id', interview_id);
    return res.status(200).json({ message: response.message, type: response.type || 'question' });
  }

  const userMessage = { role: 'user', content: message, timestamp: new Date().toISOString() };
  const updatedMessages = [...messages, userMessage];
  const conversationHistory = updatedMessages.map(m => `${m.role === 'assistant' ? '面接官' : '候補者'}: ${m.content}`).join('\n');
  const userPrompt = `これまでの会話：\n${conversationHistory}\n\n上記を踏まえ、面接官として次の応答をしてください。まだ聞いていない項目があれば自然に次に移り、すべて聞き終わったら面談を終了してください。`;

  const response = await callLLM(systemPrompt, userPrompt);
  const aiMessage = { role: 'assistant', content: response.message, timestamp: new Date().toISOString() };
  const updateData = { messages: [...updatedMessages, aiMessage] };

  if (response.type === 'complete') {
    updateData.status = 'completed';
    updateData.summaries = response.summaries;
    updateData.score = response.score;
    updateData.score_breakdown = response.score_breakdown;
    updateData.overall_comment = response.overall_comment;
  }

  if (!interview.candidate_name || interview.candidate_name === '新規候補者') {
    try {
      const nameExtract = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [{ role: 'user', content: `以下の会話から候補者の名前を抽出してください。名前が見つからない場合は「不明」と返してください。\n\n${conversationHistory}\n\n{"name": "抽出した名前"}のJSON形式のみで返してください。` }],
        response_format: { type: 'json_object' },
        max_tokens: 50,
        temperature: 0,
      });
      const nameResult = JSON.parse(nameExtract.choices[0].message.content);
      if (nameResult.name && nameResult.name !== '不明') updateData.candidate_name = nameResult.name;
    } catch {}
  }

  await supabase.from('interviews').update(updateData).eq('id', interview_id);
  return res.status(200).json({ message: response.message, type: response.type, summaries: response.summaries, score: response.score, score_breakdown: response.score_breakdown, overall_comment: response.overall_comment });
}
