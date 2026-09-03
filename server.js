import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

function liesRohenBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function fetchProxy(target, extraHeaders = {}) {
  return async (req, res) => {
    const url = `${target}${req.url ?? ''}`;
    try {
      const hatBody = req.method !== 'GET' && req.method !== 'HEAD';
      const body = hatBody ? await liesRohenBody(req) : undefined;
      const upstream = await fetch(url, {
        method: req.method,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; IndustrieRisikoApp/1.0)',
          ...(hatBody && req.headers['content-type'] ? { 'Content-Type': req.headers['content-type'] } : {}),
          ...extraHeaders,
        },
        body,
      });
      const buffer = await upstream.arrayBuffer();
      res.status(upstream.status);
      const contentType = upstream.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);
      res.end(Buffer.from(buffer));
    } catch (e) {
      res.status(502).end(`Proxy error: ${e.message}`);
    }
  };
}

// UN Security Council Consolidated List (folgt Azure-Blob-Redirect mit Zeitstempel-Token)
app.use('/proxy/un-sanctions', fetchProxy('https://scsanctions.un.org'));
// EU Financial Sanctions (403 — Zugang ohne Session nicht möglich, liefert Fehler zurück)
app.use('/proxy/eu-sanctions', fetchProxy('https://webgate.ec.europa.eu'));
// insolvenzbekanntmachungen.de (neue Domain seit 2024)
app.use('/proxy/insolvenz', fetchProxy('https://neu.insolvenzbekanntmachungen.de', {
  Accept: 'text/html,application/xhtml+xml',
}));
// Bundesanzeiger
app.use('/proxy/bundesanzeiger', fetchProxy('https://www.bundesanzeiger.de', {
  Accept: 'text/html,application/xhtml+xml',
}));
// Nominatim (Geocoding) — läuft serverseitig statt im Browser: Nominatims Nutzungsrichtlinie
// verlangt einen aussagekräftigen User-Agent, den Browser-Fetch aus Sicherheitsgründen aber
// nie tatsächlich setzen (verbotener Header) — das führt clientseitig zu Drosselung/Blockaden.
app.use('/proxy/nominatim', fetchProxy('https://nominatim.openstreetmap.org', {
  'Accept-Language': 'de',
}));
// Overpass (OSM-Landnutzungsdaten für Hochwasser/Waldbrand) — overpass-api.de liefert nicht
// zuverlässig einen Access-Control-Allow-Origin-Header, direkte Browser-Aufrufe schlagen daher
// je nach angesprochenem Lastverteiler-Knoten mit einem CORS-Fehler fehl. Wichtig: der
// User-Agent darf NICHT "Mozilla" enthalten — overpass-api.de blockt das serverseitig mit
// 406/429 (mit curl verifiziert), vermutlich um Browser-Impersonation zu unterbinden.
app.use('/proxy/overpass', fetchProxy('https://overpass-api.de', {
  'User-Agent': 'IndustrieRisikoApp/1.0',
}));

app.use(express.static(path.join(__dirname, 'dist')));

// SPA-Fallback: nur GET-Anfragen auf Pfaden ohne Dateiendung (also Routen, nicht fehlende
// Assets) liefern index.html. So bleibt Raum für künftige API-Routen (falsche Methode/Pfad
// landet nicht versehentlich als 200-HTML-Antwort) und ein fehlendes statisches Asset gibt
// weiterhin einen echten 404 statt einer HTML-Seite zurück.
app.use((req, res, next) => {
  if (req.method !== 'GET' || path.extname(req.path)) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.use((req, res) => {
  res.status(404).end('Not found');
});

app.listen(PORT, () => {
  console.log(`Industrie-Server läuft auf Port ${PORT}`);
});
