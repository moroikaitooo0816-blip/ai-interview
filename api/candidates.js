import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { candidate_name, resume_text } = req.body;

    try {
      // AIで履歴書を解析
      const parsed = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: '履歴書のテキストから情報を抽出してJSONで返してください。{"age": 数字または null, "current_job": "現職", "desired_job": "希望職種", "skills": "スキル一覧", "experience": "職務経歴の要約", "education": "学歴"} の形式で。JSONのみ返してください。'
          },
          { role: 'user', content: resume_text }
        ],
        max_tokens: 500,
        temperature: 0,
      });

      let parsedInfo = {};
      try {
        parsedInfo = JSON.parse(parsed.choices[0].message.content);
      } catch(e) {
        parsedInfo = {};
      }

      // インタビューレコードを作成
      const { data, error } = await supabase
        .from('interviews')
        .insert({
          candidate_name,
          candidate_resume_text: resume_text,
          candidate_parsed_info: parsedInfo,
          status: 'in_progress',
        })
        .select()
        .single();

      if (error) throw error;

      // 専用URLを生成
      const interviewUrl = `/video?id=${data.id}`;
      await supabase.from('interviews').update({ interview_url: interviewUrl }).eq('id', data.id);

      return res.status(200).json({ ...data, interview_url: interviewUrl, parsed_info: parsedInfo });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
