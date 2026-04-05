export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { face_id } = req.body;

  try {
    const response = await fetch('https://api.simli.ai/compose/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-simli-api-key': process.env.SIMLI_API_KEY,
      },
      body: JSON.stringify({
        faceId: face_id,
        syncAudio: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(400).json({ message: err });
    }

    const token = await response.json();
    return res.status(200).json(token);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
