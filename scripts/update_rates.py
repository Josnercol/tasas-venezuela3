"""Scrapea las tasas oficiales del BCV y actualiza rates.json.

Si el BCV no responde, conserva las últimas tasas válidas en vez de
escribir null, para que la app nunca se quede sin datos.
"""
import json
import sys
from datetime import datetime, timezone

import requests
import urllib3
from bs4 import BeautifulSoup

# El certificado del BCV suele estar mal configurado
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

URL = 'https://www.bcv.org.ve/'
RATES_FILE = 'rates.json'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
}


def parse_rate(soup, div_id):
    div = soup.find('div', id=div_id)
    strong = div.find('strong') if div else None
    if not strong:
        return None
    val = float(strong.text.strip().replace('.', '').replace(',', '.'))
    return round(val, 2) if val > 0 else None


def parse_fecha_valor(soup):
    # <span class="date-display-single" content="2026-10-16T00:00:00-04:00">
    span = soup.find('span', class_='date-display-single')
    if span and span.get('content'):
        return span['content'][:10]
    return None


def scrape(html):
    soup = BeautifulSoup(html, 'html.parser')
    return {
        'bcv_usd': parse_rate(soup, 'dolar'),
        'bcv_eur': parse_rate(soup, 'euro'),
        'fecha_valor': parse_fecha_valor(soup),
    }


def load_previous():
    try:
        with open(RATES_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def build_rates(scraped, previous, now):
    """Combina lo scrapeado con lo anterior. Devuelve el nuevo dict."""
    ok = scraped.get('bcv_usd') is not None
    if ok:
        return {
            'bcv_usd': scraped['bcv_usd'],
            'bcv_eur': scraped.get('bcv_eur') or previous.get('bcv_eur'),
            'fecha_valor': scraped.get('fecha_valor'),
            'source': 'bcv_direct',
            'timestamp': now,
        }
    # Falló: mantener las últimas tasas válidas y marcarlas como viejas
    return {
        'bcv_usd': previous.get('bcv_usd'),
        'bcv_eur': previous.get('bcv_eur'),
        'fecha_valor': previous.get('fecha_valor'),
        'source': 'stale' if previous.get('bcv_usd') else 'error',
        'timestamp': previous.get('timestamp', now),
    }


def same_data(a, b):
    keys = ('bcv_usd', 'bcv_eur', 'fecha_valor', 'source')
    return all(a.get(k) == b.get(k) for k in keys)


def main():
    previous = load_previous()
    scraped = {}
    try:
        response = requests.get(URL, headers=HEADERS, verify=False, timeout=25)
        response.raise_for_status()
        scraped = scrape(response.content)
    except Exception as e:
        print(f'Error al obtener los datos del BCV: {e}')

    rates = build_rates(scraped, previous, datetime.now(timezone.utc).isoformat())
    print(f"Resultado -> USD: {rates['bcv_usd']}, EUR: {rates['bcv_eur']}, "
          f"Fecha valor: {rates['fecha_valor']}, Estado: {rates['source']}")

    # Solo reescribir si cambió algo real (evita un commit cada 30 min)
    if same_data(rates, previous):
        print('Sin cambios en las tasas; no se reescribe rates.json')
        return 0

    with open(RATES_FILE, 'w') as f:
        json.dump(rates, f, indent=2)
    return 0


if __name__ == '__main__':
    sys.exit(main())
