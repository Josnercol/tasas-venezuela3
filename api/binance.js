// api/binance.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=59');

  try {
    const response = await fetch('https://criptoya.com/api/binance/usdt/ves', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) {
      throw new Error(`Error en API: ${response.status}`);
    }

    const data = await response.json();
    const askValue = data.ask || data.askPrice || null;

    return res.status(200).json({ ask: askValue });
  } catch (error) {
    return res.status(200).json({ ask: null, error: error.message });
  }
}
