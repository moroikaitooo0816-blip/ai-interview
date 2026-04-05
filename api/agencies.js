import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { slug, id } = req.query;
    if (slug) {
      const { data, error } = await supabase.from('agencies').select('*').eq('slug', slug).single();
      if (error) return res.status(404).json({ message: 'Agency not found' });
      return res.status(200).json(data);
    }
    if (id) {
      const { data, error } = await supabase.from('agencies').select('*').eq('id', id).single();
      if (error) return res.status(404).json({ message: 'Agency not found' });
      return res.status(200).json(data);
    }
    const { data, error } = await supabase.from('agencies').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { name, slug, admin_password, face_id, voice_id, interviewer_name, tone, questions } = req.body;
    if (!name || !slug) return res.status(400).json({ message: 'name and slug required' });
    const { data, error } = await supabase.from('agencies').insert({
      name, slug, admin_password: admin_password || 'admin1234',
      face_id, voice_id, interviewer_name, tone, questions
    }).select().single();
    if (error) return res.status(500).json({ message: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ message: 'id required' });
    const { data, error } = await supabase.from('agencies').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ message: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: 'id required' });
    const { error } = await supabase.from('agencies').delete().eq('id', id);
    if (error) return res.status(500).json({ message: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
