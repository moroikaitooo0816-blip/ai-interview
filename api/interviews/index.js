import { supabase } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const limit = parseInt(req.query.limit) || 200;
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ message: error.message });
    const mapped = data.map(row => ({
      id: row.id,
      candidate_name: row.candidate_name,
      status: row.status,
      score: row.score,
      review_status: row.review_status,
      messages: row.messages,
      summaries: row.summaries,
      score_breakdown: row.score_breakdown,
      overall_comment: row.overall_comment,
      created_date: row.created_at,
    }));
    return res.status(200).json(mapped);
  }

  if (req.method === 'POST') {
    const body = req.body;
    const { data, error } = await supabase
      .from('interviews')
      .insert([{
        candidate_name: body.candidate_name || '新規候補者',
        status: body.status || 'in_progress',
        messages: body.messages || [],
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    return res.status(200).json({
      id: data.id,
      candidate_name: data.candidate_name,
      status: data.status,
      messages: data.messages,
      created_date: data.created_at,
    });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
