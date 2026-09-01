import type { RisikoAnalyse, RisikoAmpel, NaturgefahrBewertung, Wagnisanschrift } from '../types/antrag';

const TIMEOUT_MS = 8000;

function fetchMitTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ── Geocoding ──────────────────────────────────────────────────────────────────

async function geocode(adresse: Wagnisanschrift): Promise<{ lat: number; lon: number }> {
  const q = encodeURIComponent(
    `${adresse.strasse} ${adresse.hausnummer}, ${adresse.plz} ${adresse.ort}, ${adresse.land}`
  );
  const res = await fetchMitTimeout(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
    { headers: { 'Accept-Language': 'de', 'User-Agent': 'IndustrieRisikoApp/1.0' } }
  );
  const data = await res.json();
  if (!data.length) throw new Error('Adresse nicht gefunden');
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

// ── Hilfsfunktionen ────────────────────────────────────────────────────────────

function ampelVonScore(score: number): RisikoAmpel {
  if (score <= 2) return 'gruen';
  if (score <= 3.5) return 'gelb';
  return 'rot';
}

function gesamtAmpel(bewertungen: NaturgefahrBewertung[]): RisikoAmpel {
  const scores = bewertungen.map((b) => b.score);
  const max = Math.max(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return ampelVonScore(max * 0.6 + avg * 0.4);
}

// ── Erdbeben (USGS) ────────────────────────────────────────────────────────────

async function analysiereErdbeben(lat: number, lon: number): Promise<NaturgefahrBewertung> {
  try {
    const seit = new Date();
    seit.setFullYear(seit.getFullYear() - 10);
    // maxradiuskm statt maxradius (Grad) — 150km Radius ist ausreichend
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=150&minmagnitude=3.0&starttime=${seit.toISOString().slice(0, 10)}&limit=20`;
    const res = await fetchMitTimeout(url);
    const data = await res.json();

    const events: { mag: number }[] = (data.features ?? []).map((f: { properties: { mag: number } }) => ({ mag: f.properties.mag }));
    const anzahl = events.length;
    const maxMag = anzahl > 0 ? Math.max(...events.map((e) => e.mag)) : 0;

    let score = 1;
    if (maxMag >= 6.0 || anzahl > 20) score = 5;
    else if (maxMag >= 5.0 || anzahl > 10) score = 4;
    else if (maxMag >= 4.0 || anzahl > 5) score = 3;
    else if (maxMag >= 3.0 || anzahl > 0) score = 2;

    return {
      ampel: ampelVonScore(score),
      score,
      details: {
        'Ereignisse (10 Jahre, 150km)': `${anzahl}`,
        'Höchste Magnitude': maxMag > 0 ? `M ${maxMag.toFixed(1)}` : 'keine',
      },
    };
  } catch {
    return { ampel: 'unbekannt', score: 0, details: { Fehler: 'Daten nicht verfügbar' } };
  }
}

// ── Sturm & Schnee (Open-Meteo) ────────────────────────────────────────────────

async function analysiereKlima(lat: number, lon: number): Promise<{ sturm: NaturgefahrBewertung; schnee: NaturgefahrBewertung }> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=wind_speed_10m_max,snowfall_sum&past_days=92&forecast_days=1&timezone=auto`;
    const res = await fetchMitTimeout(url);
    const data = await res.json();

    const windSpeeds: number[] = (data.daily?.wind_speed_10m_max ?? []).filter(Boolean);
    const snowfall: number[] = (data.daily?.snowfall_sum ?? []).filter(Boolean);

    const maxWind = windSpeeds.length > 0 ? Math.max(...windSpeeds) : 0;
    const p95Wind = windSpeeds.length > 0
      ? [...windSpeeds].sort((a, b) => a - b)[Math.floor(windSpeeds.length * 0.95)]
      : 0;

    let sturmScore = 1;
    if (maxWind > 120 || p95Wind > 80) sturmScore = 5;
    else if (maxWind > 100 || p95Wind > 65) sturmScore = 4;
    else if (maxWind > 80 || p95Wind > 50) sturmScore = 3;
    else if (maxWind > 60 || p95Wind > 40) sturmScore = 2;

    const maxSnow = snowfall.length > 0 ? Math.max(...snowfall) : 0;
    const schneeScore = maxSnow > 30 ? 4 : maxSnow > 15 ? 3 : maxSnow > 3 ? 2 : 1;

    return {
      sturm: {
        ampel: ampelVonScore(sturmScore),
        score: sturmScore,
        details: {
          'Max. Windgeschwindigkeit (km/h)': maxWind > 0 ? maxWind.toFixed(0) : 'k.A.',
          '95-Perzentil Wind (km/h)': p95Wind > 0 ? p95Wind.toFixed(0) : 'k.A.',
          'Zeitraum': 'letzte 92 Tage',
        },
      },
      schnee: {
        ampel: ampelVonScore(schneeScore),
        score: schneeScore,
        details: {
          'Max. Schneefall (cm/Tag)': maxSnow > 0 ? maxSnow.toFixed(1) : 'k.A.',
          'Zeitraum': 'letzte 92 Tage',
        },
      },
    };
  } catch {
    const fallback: NaturgefahrBewertung = { ampel: 'unbekannt', score: 0, details: { Fehler: 'Daten nicht verfügbar' } };
    return { sturm: fallback, schnee: fallback };
  }
}

// ── Hochwasser + Waldbrand (zwei parallele count-Queries) ─────────────────────

async function overpassCount(query: string): Promise<number> {
  const res = await fetchMitTimeout('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const data = await res.json();
  const countEl = (data.elements ?? []).find((e: { type: string }) => e.type === 'count');
  return parseInt(countEl?.tags?.total ?? '0', 10);
}

async function analysiereOSM(lat: number, lon: number): Promise<{ hochwasser: NaturgefahrBewertung; waldbrand: NaturgefahrBewertung }> {
  const [river, stream, canal, forest, wood, scrub] = await Promise.all([
    overpassCount(`[out:json][timeout:7];way["waterway"="river"](around:2000,${lat},${lon});out count;`).catch(() => 0),
    overpassCount(`[out:json][timeout:7];way["waterway"="stream"](around:2000,${lat},${lon});out count;`).catch(() => 0),
    overpassCount(`[out:json][timeout:7];way["waterway"="canal"](around:2000,${lat},${lon});out count;`).catch(() => 0),
    overpassCount(`[out:json][timeout:7];way["landuse"="forest"](around:3000,${lat},${lon});out count;`).catch(() => 0),
    overpassCount(`[out:json][timeout:7];way["landuse"="wood"](around:3000,${lat},${lon});out count;`).catch(() => 0),
    overpassCount(`[out:json][timeout:7];way["natural"="wood"](around:3000,${lat},${lon});out count;`).catch(() => 0),
  ]);

  const gewaesser = river + stream + canal;
  const wald = forest + wood + scrub;

  let hwScore = 1;
  if (gewaesser > 10) hwScore = 5;
  else if (gewaesser > 6) hwScore = 4;
  else if (gewaesser > 3) hwScore = 3;
  else if (gewaesser > 0) hwScore = 2;

  let wbScore = 1;
  if (wald > 15) wbScore = 4;
  else if (wald > 8) wbScore = 3;
  else if (wald > 2) wbScore = 2;

  return {
    hochwasser: {
      ampel: ampelVonScore(hwScore),
      score: hwScore,
      details: { 'Gewässer im Umkreis 2km': `${gewaesser}`, 'Hinweis': 'Basiert auf OSM-Daten (kein ZÜRS)' },
    },
    waldbrand: {
      ampel: ampelVonScore(wbScore),
      score: wbScore,
      details: { 'Waldflächen im Umkreis 3km': `${wald}`, 'Hinweis': 'Basiert auf OSM-Landnutzungsdaten' },
    },
  };
}

// ── Hagel (Näherung über Klimazone) ───────────────────────────────────────────

function analysiereHagel(lat: number, lon: number): NaturgefahrBewertung {
  const inHagelzone =
    (lat >= 44 && lat <= 52 && lon >= 6 && lon <= 18) ||
    (lat >= 43 && lat <= 47 && lon >= 8 && lon <= 16);

  const score = inHagelzone ? 3 : 2;
  return {
    ampel: ampelVonScore(score),
    score,
    details: {
      'Hagelzone': inHagelzone ? 'Erhöhtes Hagelrisiko (Mitteleuropa/Alpenrand)' : 'Normales Hagelrisiko',
      'Hinweis': 'Näherung — für DE empfehlen wir ZÜRS-Hageldaten',
    },
  };
}

// ── Hauptfunktion ──────────────────────────────────────────────────────────────

export async function analysiereRisiko(adresse: Wagnisanschrift): Promise<RisikoAnalyse> {
  const { lat, lon } = await geocode(adresse);

  // Nur noch 3 parallele Requests statt 4
  const [erdbeben, klima, osm] = await Promise.all([
    analysiereErdbeben(lat, lon),
    analysiereKlima(lat, lon),
    analysiereOSM(lat, lon),
  ]);

  const hagel = analysiereHagel(lat, lon);
  const { sturm, schnee } = klima;
  const { hochwasser, waldbrand } = osm;
  const alle = [hochwasser, sturm, erdbeben, hagel, waldbrand, schnee];

  return {
    lat, lon,
    gesamtAmpel: gesamtAmpel(alle),
    hochwasser, sturm, erdbeben, hagel, waldbrand, schnee,
    analysiertAm: new Date().toISOString(),
  };
}

// ── Regelbasierte Einschätzung ──────────────────────────────────────────────────

const GEFAHR_LABELS: Record<string, string> = {
  hochwasser: 'Hochwasser/Überschwemmung',
  sturm: 'Sturm/Orkan',
  erdbeben: 'Erdbeben',
  hagel: 'Hagel',
  waldbrand: 'Waldbrand',
  schnee: 'Schnee-/Eislast',
};

export function formuliereRisikoEinschaetzung(analyse: RisikoAnalyse): string {
  const kategorien: [string, NaturgefahrBewertung][] = [
    ['hochwasser', analyse.hochwasser], ['sturm', analyse.sturm], ['erdbeben', analyse.erdbeben],
    ['hagel', analyse.hagel], ['waldbrand', analyse.waldbrand], ['schnee', analyse.schnee],
  ];
  const rot = kategorien.filter(([, b]) => b.ampel === 'rot').map(([k]) => GEFAHR_LABELS[k]);
  const gelb = kategorien.filter(([, b]) => b.ampel === 'gelb').map(([k]) => GEFAHR_LABELS[k]);

  if (analyse.gesamtAmpel === 'gruen') {
    return `Das Gesamtrisiko durch Naturgefahren wird als gering eingestuft. Keine der geprüften Gefahrenkategorien (Hochwasser, Sturm, Erdbeben, Hagel, Waldbrand, Schnee-/Eislast) weist eine erhöhte Exposition auf. Aus Naturgefahrensicht bestehen keine Bedenken gegen eine reguläre Zeichnung.`;
  }
  if (analyse.gesamtAmpel === 'gelb') {
    return `Das Gesamtrisiko durch Naturgefahren wird als mittel eingestuft. Erhöhte Exposition besteht bei: ${gelb.join(', ')}. Empfehlung: Prämien- und Bedingungswerk auf die genannten Gefahren abstimmen, ggf. Selbstbehalte prüfen.`;
  }
  if (analyse.gesamtAmpel === 'rot') {
    const zusatz = gelb.length > 0 ? ` Erhöht ist zudem: ${gelb.join(', ')}.` : '';
    return `Das Gesamtrisiko durch Naturgefahren wird als hoch eingestuft. Kritisch bewertet sind: ${rot.join(', ')}.${zusatz} Empfehlung: Risiko vor Zeichnung durch einen Fachreferenten prüfen lassen, Deckungssummen und Selbstbehalte anpassen oder Ausschlüsse für die kritischen Gefahren erwägen.`;
  }
  return `Eine automatische Einschätzung des Gesamtrisikos war nicht möglich — bitte die Einzelbewertungen manuell prüfen.`;
}
