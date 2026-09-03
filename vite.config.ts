import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

function liesRohenBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function fetchProxy(prefix: string, target: string, extraHeaders?: Record<string, string>): Plugin {
  return {
    name: `proxy-${prefix.replace(/\//g, '-')}`,
    configureServer(server) {
      server.middlewares.use(prefix, async (req: IncomingMessage, res: ServerResponse) => {
        const url = `${target}${req.url ?? ''}`;
        try {
          const hatBody = req.method !== 'GET' && req.method !== 'HEAD';
          const body = hatBody ? await liesRohenBody(req) : undefined;
          const upstream = await fetch(url, {
            method: req.method ?? 'GET',
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; IndustrieRisikoApp/1.0)',
              ...(hatBody && req.headers['content-type'] ? { 'Content-Type': req.headers['content-type'] } : {}),
              ...extraHeaders,
            },
            body,
          });
          const buffer = await upstream.arrayBuffer();
          res.statusCode = upstream.status;
          const ct = upstream.headers.get('content-type');
          if (ct) res.setHeader('Content-Type', ct);
          res.end(Buffer.from(buffer));
        } catch (e) {
          res.statusCode = 502;
          res.end(`Proxy error: ${(e as Error).message}`);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // UN Security Council Consolidated List (folgt Azure-Blob-Redirect mit Zeitstempel-Token)
    fetchProxy('/proxy/un-sanctions', 'https://scsanctions.un.org'),
    // EU Financial Sanctions (403 — Zugang ohne Session nicht möglich, liefert Fehler zurück)
    fetchProxy('/proxy/eu-sanctions', 'https://webgate.ec.europa.eu'),
    // insolvenzbekanntmachungen.de (neue Domain seit 2024)
    fetchProxy('/proxy/insolvenz', 'https://neu.insolvenzbekanntmachungen.de', {
      Accept: 'text/html,application/xhtml+xml',
    }),
    // Bundesanzeiger
    fetchProxy('/proxy/bundesanzeiger', 'https://www.bundesanzeiger.de', {
      Accept: 'text/html,application/xhtml+xml',
    }),
    // Nominatim (Geocoding) — läuft serverseitig statt im Browser: Nominatims
    // Nutzungsrichtlinie verlangt einen aussagekräftigen User-Agent, den Browser-Fetch aus
    // Sicherheitsgründen aber nie tatsächlich setzen (verbotener Header).
    fetchProxy('/proxy/nominatim', 'https://nominatim.openstreetmap.org', {
      'Accept-Language': 'de',
    }),
    // Overpass (OSM-Landnutzungsdaten für Hochwasser/Waldbrand) — overpass-api.de liefert
    // nicht zuverlässig einen Access-Control-Allow-Origin-Header, direkte Browser-Aufrufe
    // schlagen daher je nach Lastverteiler-Knoten mit einem CORS-Fehler fehl. Wichtig: der
    // User-Agent darf NICHT "Mozilla" enthalten — overpass-api.de blockt das serverseitig
    // mit 406/429 (mit curl verifiziert), vermutlich um Browser-Impersonation zu unterbinden.
    fetchProxy('/proxy/overpass', 'https://overpass-api.de', {
      'User-Agent': 'IndustrieRisikoApp/1.0',
    }),
  ],
});
