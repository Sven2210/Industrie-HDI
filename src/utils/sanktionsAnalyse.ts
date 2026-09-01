import type { SanktionsAnalyse, SanktionsTreffer, RisikoAmpel } from '../types/antrag';

const TIMEOUT_MS = 15000;

function fetchMitTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
  const s = normalisiere(suchterm);
  const k = normalisiere(kandidat);
  if (s.length < 3 || k.length < 3) return false;
  return k.includes(s) || s.includes(k);
}

// ── UN Security Council Consolidated List ─────────────────────────────────────

async function pruefeUN(suchbegriffe: string[]): Promise<SanktionsTreffer[]> {
  const res = await fetchMitTimeout('/proxy/un-sanctions/resources/xml/en/consolidated.xml');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const treffer: SanktionsTreffer[] = [];

  doc.querySelectorAll('INDIVIDUAL').forEach((el) => {
    const nameParts = ['FIRST_NAME', 'SECOND_NAME', 'THIRD_NAME', 'FOURTH_NAME']
      .map((tag) => el.querySelector(tag)?.textContent?.trim() ?? '')
      .filter(Boolean);
    const fullName = nameParts.join(' ');
    if (suchbegriffe.some((s) => istTreffer(s, fullName))) {
      treffer.push({
        quelle: 'UN',
        name: fullName,
        typ: 'Person',
        regelung: el.querySelector('UN_LIST_TYPE')?.textContent?.trim(),
      });
    }
  });

  doc.querySelectorAll('ENTITY').forEach((el) => {
    const name = el.querySelector('FIRST_NAME')?.textContent?.trim() ?? '';
    if (suchbegriffe.some((s) => istTreffer(s, name))) {
      treffer.push({ quelle: 'UN', name, typ: 'Organisation' });
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
