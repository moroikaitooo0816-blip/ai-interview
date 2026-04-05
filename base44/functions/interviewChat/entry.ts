import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
  const questionList = questions.map((q, i) =>
    `${i + 1}. ${q.text}${q.deepening ? "（深掘りあり）" : ""}`
  ).join("\n");
  const total = questions.length;

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
{
  "type": "question",
  "message": "面接官としてのメッセージ",
  "current_item": 現在聞いている項目番号(1-${total}),
  "is_deepening": true/false
}

${total}項目すべてのヒアリングが完了した場合のみ：
{
  "type": "complete",
  "message": "面談終了のメッセージ",
  "summaries": [
${summaryTemplate}
  ],
  "score": 総合点数(0-100),
  "score_breakdown": [
${scoreTemplate}
  ],
  "overall_comment": "総合評価コメント"
}

【評価基準】
- 各項目10点満点、合計を100点満点にスケーリング
- コミュニケーション能力、具体性、論理性、熱意を評価
- 曖昧な回答や不十分な回答は減点

必ずJSON形式のみで応答してください。`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { interview_id, message, is_start } = await req.json();

  // Load settings
  const settingsList = await base44.asServiceRole.entities.InterviewSettings.list("-created_date", 1);
  const settings = settingsList.length > 0 ? settingsList[0] : null;
  const questions = (settings && settings.questions && settings.questions.length > 0)
    ? settings.questions
    : DEFAULT_QUESTIONS;
  const tone = settings?.tone || "strict";

  const systemPrompt = buildSystemPrompt(questions, tone);

  if (is_start) {
    const interview = await base44.entities.Interview.get(interview_id);
    const messages = interview.messages || [];

    const prompt = `${systemPrompt}\n\n---\n面談を開始してください。まず候補者にご挨拶し、お名前を確認してください。`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          type: { type: "string" },
          message: { type: "string" },
          current_item: { type: "number" },
          is_deepening: { type: "boolean" }
        }
      },
      model: "gpt_5"
    });

    const aiMessage = {
      role: "assistant",
      content: response.message,
      timestamp: new Date().toISOString()
    };

    await base44.entities.Interview.update(interview_id, {
      messages: [...messages, aiMessage]
    });

    return Response.json({ message: response.message, type: response.type });
  }

  // Regular message
  const interview = await base44.entities.Interview.get(interview_id);
  const messages = interview.messages || [];

  const userMessage = {
    role: "user",
    content: message,
    timestamp: new Date().toISOString()
  };
  const updatedMessages = [...messages, userMessage];

  const conversationHistory = updatedMessages.map(m =>
    `${m.role === 'assistant' ? '面接官' : '候補者'}: ${m.content}`
  ).join('\n');

  const prompt = `${systemPrompt}\n\n---\nこれまでの会話：\n${conversationHistory}\n\n上記の会話を踏まえ、面接官として次の応答をしてください。まだ聞いていない項目があれば自然に次の項目に移り、すべて聞き終わったら面談を終了してください。`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["question", "complete"] },
        message: { type: "string" },
        current_item: { type: "number" },
        is_deepening: { type: "boolean" },
        summaries: {
          type: "array",
          items: { type: "object", properties: { item: { type: "string" }, summary: { type: "string" } } }
        },
        score: { type: "number" },
        score_breakdown: {
          type: "array",
          items: { type: "object", properties: { item: { type: "string" }, score: { type: "number" }, comment: { type: "string" } } }
        },
        overall_comment: { type: "string" }
      }
    },
    model: "gpt_5"
  });

  const aiMessage = {
    role: "assistant",
    content: response.message,
    timestamp: new Date().toISOString()
  };

  const updateData = {
    messages: [...updatedMessages, aiMessage]
  };

  if (response.type === "complete") {
    updateData.status = "completed";
    updateData.summaries = response.summaries;
    updateData.score = response.score;
    updateData.score_breakdown = response.score_breakdown;
    updateData.overall_comment = response.overall_comment;
  }

  // Update candidate name if not set
  if (!interview.candidate_name || interview.candidate_name === '新規候補者') {
    const nameResult = await base44.integrations.Core.InvokeLLM({
      prompt: `以下の会話から候補者の名前を抽出してください。名前が見つからない場合は「不明」と返してください。\n\n${conversationHistory}`,
      response_json_schema: { type: "object", properties: { name: { type: "string" } } }
    });
    if (nameResult.name && nameResult.name !== '不明') {
      updateData.candidate_name = nameResult.name;
    }
  }

  await base44.entities.Interview.update(interview_id, updateData);

  return Response.json({
    message: response.message,
    type: response.type,
    summaries: response.summaries,
    score: response.score,
    score_breakdown: response.score_breakdown,
    overall_comment: response.overall_comment
  });
});