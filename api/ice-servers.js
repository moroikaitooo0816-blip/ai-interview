export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const response = await fetch('https://api.simli.ai/compose/ice', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-simli-api-key': process.env.SIMLI_API_KEY,
      },
    });

    if (!response.ok) {
      return res.status(200).json([{ urls: ['stun:stun.l.google.com:19302'] }]);
    }

    const iceServers = await response.json();
    return res.status(200).json(iceServers);
  } catch {
    return res.status(200).json([{ urls: ['stun:stun.l.google.com:19302'] }]);
  }
}
