// api/binance.js
export default async function handler(req, res) {
  // Permitir accesos desde tu mismo dominio sin problemas de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=59');

  try {
    const response = await fetch('https://criptoya.com/api/binancep2p/USDT/VES/100', {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Error en CriptoYa: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json({ ask: data.ask || null, bid: data.bid || null });
  } catch (error) {
    return res.status(500).json({ error: error.message, ask: null });
  }
}
