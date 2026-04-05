import { supabase } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('interview_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) return res.status(500).json({ message: error.message });
    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    const { id, questions, tone } = req.body;

    if (id) {
      const { data, error } = await supabase
        .from('interview_settings')
        .update({ questions, tone, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ message: error.message });
      return res.status(200).json(data);
    } else {
      const { data, error } = await supabase
        .from('interview_settings')
        .insert([{ questions, tone, is_active: true }])
        .select()
        .single();

      if (error) return res.status(500).json({ message: error.message });
      return res.status(200).json(data);
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
