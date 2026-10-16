// api/binance.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Consulta directa a CriptoYa con la ruta estándar USDT/VES
    const response = await fetch('https://criptoya.com/api/binancep2p/USDT/VES/100', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000) // no esperar indefinidamente si CriptoYa se cuelga
    });

    const text = await response.text();

    // Validar si la respuesta es un JSON antes de parsear
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Respuesta no válida del API: ${text.slice(0, 50)}`);
    }

    const askValue = data.ask || data.askPrice || data.price || null;
    const bidValue = data.bid || data.bidPrice || null;

    // Solo cachear respuestas buenas
    res.setHeader('Cache-Control', askValue
      ? 's-maxage=30, stale-while-revalidate=59'
      : 'no-store');

    return res.status(200).json({ ask: askValue, bid: bidValue });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ask: null, error: error.message });
  }
}
