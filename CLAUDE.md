# Industrie — Prototyp Industrieversicherung

WebApp-Prototyp für einen Industrieversicherer: Login → Vorgangssuche → 6-Schritte-Antrag
mit PDF-Erzeugung → Risikocheck (Geo-Naturgefahren-Analyse per Nominatim/Overpass/USGS,
UN-Sanktionslisten-Screening, Karten als OSM-iframe-Embeds).

## Stack
React 19 + TypeScript + Vite + Tailwind + Material UI (MUI). Repo: github.com/Sven2210/Industrie

## Starten & Verifizieren
- Dev-Server: `npm run dev` (Vite, Standard-Port 5173 — bei Belegung weicht Vite auf 5174+ aus;
  immer den tatsächlich gemeldeten Port verwenden).
- Nach Änderungen die App selbst im Browser prüfen, bevor "fertig" gemeldet wird.
- TypeScript-Check: `npm run build` oder `./node_modules/.bin/tsc -b`
  (NICHT `npx tsc` — das installiert ein falsches Paket).

## Wichtige Dateien
- `src/utils/risikoAnalyse.ts` — Geo-/Naturgefahren-Analyse (freie APIs, Ampel-Scores)
- `src/utils/sanktionsAnalyse.ts` — UN-Sanktionslisten-Screening (XML)
- `src/types/antrag.ts` — zentrale Typen

## Einschränkungen
- Die Anthropic-SDK-Integration ist OHNE API-Key nicht nutzbar (Org-Policy verbietet eigene Keys).
  Keine weiteren Features darauf aufbauen.
- Karten laufen bewusst als OSM-iframe-Embed — Leaflet/react-leaflet wurde wegen
  Rendering-Problemen entfernt, nicht wieder einführen.
- EU-Sanktionsliste (403/Auth-Pflicht) und Bundesanzeiger-Prüfung wurden bewusst entfernt.
- `src.Industrie/` ist eine alte Import-Kopie, kein aktiver Code.
