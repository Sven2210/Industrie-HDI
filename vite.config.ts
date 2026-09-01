import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

function fetchProxy(prefix: string, target: string, extraHeaders?: Record<string, string>): Plugin {
  return {
    name: `proxy-${prefix.replace(/\//g, '-')}`,
    configureServer(server) {
      server.middlewares.use(prefix, async (req: IncomingMessage, res: ServerResponse) => {
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
  ],
});
