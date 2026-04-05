import { supabase } from '../_db.js';

export default async function handler(req, res) {
  const { id } = req.query;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ message: 'Not found' });
    return res.status(200).json({
      id: data.id,
      candidate_name: data.candidate_name,
      status: data.status,
      score: data.score,
      review_status: data.review_status,
      messages: data.messages,
      summaries: data.summaries,
      score_breakdown: data.score_breakdown,
      overall_comment: data.overall_comment,
      created_date: data.created_at,
    });
  }

  if (req.method === 'PATCH') {
    const body = req.body;
    const updateData = {};
    if (body.review_status !== undefined) updateData.review_status = body.review_status;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.score !== undefined) updateData.score = body.score;
    if (body.messages !== undefined) updateData.messages = body.messages;
    if (body.summaries !== undefined) updateData.summaries = body.summaries;
    if (body.score_breakdown !== undefined) updateData.score_breakdown = body.score_breakdown;
    if (body.overall_comment !== undefined) updateData.overall_comment = body.overall_comment;
    if (body.candidate_name !== undefined) updateData.candidate_name = body.candidate_name;

    const { data, error } = await supabase
      .from('interviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    return res.status(200).json({ id: data.id, ...updateData });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
