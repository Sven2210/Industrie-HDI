import { parseFormattedNumber } from './format';
import type { Risikokalkulation, Unternehmen, ZuAbschlag } from '../types/antrag';

export const COUNTRY_TAX_RATES: Record<string, number> = {
  'Deutschland': 19,
  'Österreich': 11,
  'Schweiz': 5,
  'Spanien': 8.15,
  'Frankreich': 9,
  'Niederlande': 21,
  'Belgien': 9.25,
  'Italien': 22.25,
  'Polen': 0,
  'Tschechien': 0,
  'Ungarn': 0,
  'Schweden': 0,
  'Dänemark': 0,
  'Norwegen': 0,
  'Großbritannien': 12,
  'USA': 0,
  'Kanada': 0,
  'Sonstiges': 0,
};

export const calcRisikobeitragssatz = (kalk: Risikokalkulation): number => {
  const gbs = parseFormattedNumber(kalk.grundbeitragssatz);
  if (!gbs) return 0;
  const deg = parseFormattedNumber(kalk.degression) || 0;
  return gbs * (1 - deg / 100);
};

export const calcVorschlagsbeitragssatz = (kalk: Risikokalkulation): number => {
  let rate = calcRisikobeitragssatz(kalk);
  if (!rate) return 0;
  for (const z of kalk.zuschlaegeRBS as ZuAbschlag[]) {
    const pct = parseFormattedNumber(z.prozent);
    if (pct) rate = rate * (1 + pct / 100);
  }
  for (const a of kalk.abschlaegeRBS as ZuAbschlag[]) {
    const pct = parseFormattedNumber(a.prozent);
    if (pct) rate = rate * (1 - pct / 100);
  }
  return Math.round(rate * 1000) / 1000;
};

export const calcJahresnettobeitrag = (
  jahresumsatz: number,
  vorschlagsbeitragssatz: number,
): number => {
  if (!jahresumsatz || !vorschlagsbeitragssatz) return 0;
  return Math.round(jahresumsatz * vorschlagsbeitragssatz / 1000);
};

export const calcJahresbruttobeitrag = (
  jahresnettobeitrag: number,
  steuersatz: number,
): number => {
  return Math.round(jahresnettobeitrag * (1 + steuersatz / 100));
};

export const calcUnternehmenBeitraege = (
  unternehmen: Unternehmen[],
  vorschlagsbeitragssatz: number,
) => {
  return unternehmen.map((u) => {
    const umsatz = parseFormattedNumber(u.jahresumsatz);
    const steuer = parseFormattedNumber(u.steuersatz);
    const netto = calcJahresnettobeitrag(umsatz, vorschlagsbeitragssatz);
    const mindest = parseFormattedNumber(u.mindestbeitrag);
    const effektivNetto = mindest > 0 ? Math.max(netto, mindest) : netto;
    const brutto = calcJahresbruttobeitrag(effektivNetto, steuer);
    return { netto: effektivNetto, brutto, steuer };
  });
};

export const calcGesamtNettobrutto = (
  unternehmen: Unternehmen[],
  vorschlagsbeitragssatz: number,
) => {
  const beitraege = calcUnternehmenBeitraege(unternehmen, vorschlagsbeitragssatz);
  const nettoGesamt = beitraege.reduce((sum, b) => sum + b.netto, 0);
  const bruttoGesamt = beitraege.reduce((sum, b) => sum + b.brutto, 0);
  return { nettoGesamt, bruttoGesamt };
};

export const formatCurrency = (value: number): string => {
  if (!value && value !== 0) return '—';
  return value.toLocaleString('de-DE') + ' EUR';
};

export const formatPromille = (value: number): string => {
  if (!value && value !== 0) return '—';
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + ' ‰';
};
