import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

function fetchProxy(target, extraHeaders = {}) {
  return async (req, res) => {
    const url = `${target}${req.url ?? ''}`;
    try {
      const upstream = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; IndustrieRisikoApp/1.0)',
          ...extraHeaders,
        },
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

app.use(express.static(path.join(__dirname, 'dist')));

// SPA-Fallback: alle übrigen GET-Anfragen liefern index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Industrie-Server läuft auf Port ${PORT}`);
});
