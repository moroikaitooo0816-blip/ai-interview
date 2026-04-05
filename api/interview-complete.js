import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { candidate_id, conversation_history } = req.body;
  if (!candidate_id || !conversation_history?.length) {
    return res.status(400).json({ message: 'candidate_id and conversation_history required' });
  }

  try {
    // AIによる評価レポート生成
    const evaluation = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: `あなたは転職支援会社のベテラン面接官です。以下の面談会話を分析して、候補者の評価レポートをJSONで返してください。

必ず以下の形式で返してください：
{
  "overall_score": 0-100の数値,
  "summary": "総合評価コメント（3文程度）",
  "scores": {
    "communication": 0-100,
    "motivation": 0-100,
    "experience": 0-100,
    "potential": 0-100
  },
  "strengths": ["強み1", "強み2", "強み3"],
  "concerns": ["懸念点1", "懸念点2"],
  "recommendation": "pass" または "hold" または "fail",
  "recommendation_reason": "判定理由"
}

JSONのみ返してください。`
        },
        {
          role: 'user',
          content: '面談会話:\n' + conversation_history.map(m => `${m.role === 'assistant' ? 'AI面接官' : '候補者'}: ${m.content}`).join('\n')
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    let report = {};
    try {
      const text = evaluation.choices[0].message.content.replace(/```json|```/g, '').trim();
      report = JSON.parse(text);
    } catch(e) {
      report = { overall_score: 0, summary: '評価生成エラー', recommendation: 'hold' };
    }

    // 会話ログとレポートをDBに保存
    const messages = conversation_history.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('interviews')
      .update({
        status: 'completed',
        messages,
        score: report.overall_score,
        review_status: report.recommendation,
        overall_comment: report.summary,
        score_breakdown: [
          { category: 'コミュニケーション', score: report.scores?.communication || 0 },
          { category: 'モチベーション', score: report.scores?.motivation || 0 },
          { category: '経験・スキル', score: report.scores?.experience || 0 },
          { category: 'ポテンシャル', score: report.scores?.potential || 0 },
        ],
        summaries: [
          ...(report.strengths || []).map(s => ({ type: 'strength', content: s })),
          ...(report.concerns || []).map(c => ({ type: 'concern', content: c })),
          { type: 'recommendation_reason', content: report.recommendation_reason || '' }
        ],
      })
      .eq('id', candidate_id);

    if (error) throw error;

    return res.status(200).json({ success: true, report });

  } catch (error) {
    console.error('Interview complete error:', error);
    return res.status(500).json({ message: error.message });
  }
}
