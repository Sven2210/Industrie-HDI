import type { SanktionsAnalyse, SanktionsTreffer, RisikoAmpel } from '../types/antrag';

const TIMEOUT_MS = 15000;

function fetchMitTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  // Mit Grund abbrechen, damit fetch() mit einer sprechenden Fehlermeldung statt dem
  // kryptischen Standardtext "signal is aborted without reason" ablehnt.
  const timer = setTimeout(
    () => controller.abort(new Error(`Zeitüberschreitung nach ${TIMEOUT_MS / 1000}s`)),
    TIMEOUT_MS
  );
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function normalisiere(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function istTreffer(suchterm: string, kandidat: string): boolean {
  const sTokens = normalisiere(suchterm).split(' ').filter((t) => t.length >= 2);
  const kTokens = normalisiere(kandidat).split(' ').filter((t) => t.length >= 2);
  if (sTokens.length === 0 || kTokens.length === 0) return false;
  // Reihenfolge-unabhängig: jedes Token der kürzeren Namensliste muss in der
  // längeren vorkommen (z. B. "Yun Ho-Jin" muss "Ho-Jin Yun" treffen).
  const [kleiner, groesser] = sTokens.length <= kTokens.length ? [sTokens, kTokens] : [kTokens, sTokens];
  return kleiner.every((t) => groesser.some((g) => g.includes(t) || t.includes(g)));
}

// ── UN Security Council Consolidated List ─────────────────────────────────────

async function pruefeUN(suchbegriffe: string[]): Promise<SanktionsTreffer[]> {
  const res = await fetchMitTimeout('/proxy/un-sanctions/resources/xml/en/consolidated.xml');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Antwort der UN-Sanktionsliste konnte nicht als XML gelesen werden');
  }
  const treffer: SanktionsTreffer[] = [];

  doc.querySelectorAll('INDIVIDUAL').forEach((el) => {
    const nameParts = ['FIRST_NAME', 'SECOND_NAME', 'THIRD_NAME', 'FOURTH_NAME']
      .map((tag) => el.querySelector(tag)?.textContent?.trim() ?? '')
      .filter(Boolean);
    const fullName = nameParts.join(' ');
    const aliasNamen = Array.from(el.querySelectorAll('INDIVIDUAL_ALIAS ALIAS_NAME'))
      .map((a) => a.textContent?.trim() ?? '')
      .filter(Boolean);
    const alleNamen = [fullName, ...aliasNamen];
    if (suchbegriffe.some((s) => alleNamen.some((n) => istTreffer(s, n)))) {
      treffer.push({
        quelle: 'UN',
        name: aliasNamen.length ? `${fullName} (alias: ${aliasNamen.join(', ')})` : fullName,
        typ: 'Person',
        regelung: el.querySelector('UN_LIST_TYPE')?.textContent?.trim(),
      });
    }
  });

  doc.querySelectorAll('ENTITY').forEach((el) => {
    const name = el.querySelector('FIRST_NAME')?.textContent?.trim() ?? '';
    const aliasNamen = Array.from(el.querySelectorAll('ENTITY_ALIAS ALIAS_NAME'))
      .map((a) => a.textContent?.trim() ?? '')
      .filter(Boolean);
    const alleNamen = [name, ...aliasNamen];
    if (suchbegriffe.some((s) => alleNamen.some((n) => istTreffer(s, n)))) {
      treffer.push({
        quelle: 'UN',
        name: aliasNamen.length ? `${name} (alias: ${aliasNamen.join(', ')})` : name,
        typ: 'Organisation',
      });
    }
  });

  return treffer;
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────────

export async function pruefeSanktionen(
  firmaName: string,
  ansprechpartner: { vorname: string; name: string }[]
): Promise<SanktionsAnalyse> {
  const geprueftePersonen = ansprechpartner
    .filter((p) => p.name.trim())
    .map((p) => `${p.vorname} ${p.name}`.trim());

  const suchbegriffe = [firmaName, ...geprueftePersonen].filter((s) => s.length >= 3);

  let treffer: SanktionsTreffer[] = [];
  let fehler: string | undefined;
  let ampel: RisikoAmpel;

  try {
    treffer = await pruefeUN(suchbegriffe);
    ampel = treffer.length > 0 ? 'rot' : 'gruen';
  } catch (e) {
    fehler = (e as Error)?.message ?? 'Fehler';
    ampel = 'unbekannt';
  }

  return {
    ampel,
    treffer,
    geprueftAm: new Date().toISOString(),
    gepruefteFirma: firmaName,
    geprueftePersonen,
    fehler,
  };
}

// ── Regelbasierte Einschätzung ──────────────────────────────────────────────────

export function formuliereSanktionsEinschaetzung(analyse: SanktionsAnalyse): string {
  if (analyse.ampel === 'rot') {
    const liste = analyse.treffer
      .map((t) => `${t.name} (${t.typ}${t.regelung ? ', ' + t.regelung : ''})`)
      .join('; ');
    return `Die automatische Prüfung hat ${analyse.treffer.length} Übereinstimmung(en) mit der UN Security Council Consolidated List ergeben: ${liste}. Ein Vertragsabschluss mit sanktionierten Personen oder Organisationen ist rechtlich untersagt und kann zu empfindlichen Bußgeldern führen. Der Vorgang darf ohne vertiefte Prüfung durch die Compliance-/Rechtsabteilung nicht weiterbearbeitet werden. Empfehlung: Zeichnung stoppen und sofort eskalieren, bis eine Freigabe erteilt oder der Treffer eindeutig widerlegt wurde.`;
  }
  if (analyse.ampel === 'gruen') {
    return `Es wurden keine Übereinstimmungen mit der UN Security Council Consolidated List gefunden. Firma und geprüfte Personen sind aktuell nicht gelistet. Aus Sanktionssicht bestehen keine Bedenken gegen eine Weiterbearbeitung des Vorgangs.`;
  }
  return `Die automatische Prüfung konnte nicht vollständig durchgeführt werden${analyse.fehler ? ` (${analyse.fehler})` : ''}. Da keine verlässliche Sanktionsbewertung vorliegt, sollte vor Zeichnung eine manuelle Prüfung gegen die aktuellen EU- und UN-Sanktionslisten erfolgen.`;
}
