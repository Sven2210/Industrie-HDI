import { jsPDF } from 'jspdf';
import type { AntragData } from '../types/antrag';
import { RISIKOBELEGENHEIT_LABELS } from '../types/antrag';
import {
  calcVorschlagsbeitragssatz,
  calcJahresnettobeitrag,
  calcJahresbruttobeitrag,
} from './calculations';
import { parseFormattedNumber } from './format';

type RGB = [number, number, number];

export const generateVorschlagPDF = (data: AntragData): void => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const MARGIN = 18;
  const COL = W - MARGIN * 2;

  let y = 0;

  const rgb = (r: number, g: number, b: number) => [r, g, b] as RGB;

  const setFont = (size: number, style: 'normal' | 'bold' = 'normal', color: RGB = rgb(15, 23, 42)) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const drawRect = (x: number, yy: number, w: number, h: number, c: RGB) => {
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(x, yy, w, h, 'F');
  };

  const hLine = (y1: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, y1, W - MARGIN, y1);
  };

  // Header
  drawRect(0, 0, W, 28, rgb(11, 20, 38));
  setFont(16, 'bold', rgb(255, 255, 255));
  doc.text('TARIF', MARGIN, 12);
  setFont(16, 'normal', rgb(96, 165, 250));
  doc.text('rechner', MARGIN + 22, 12);
  setFont(10, 'normal', rgb(148, 163, 184));
  doc.text('INdustrieversicherung', MARGIN, 20);
  setFont(11, 'bold', rgb(255, 255, 255));
  doc.text('VORSCHLAG', W - MARGIN, 12, { align: 'right' });
  setFont(8, 'normal', rgb(148, 163, 184));
  doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, W - MARGIN, 20, { align: 'right' });

  y = 36;

  // Vorgang band
  drawRect(MARGIN, y, COL, 10, rgb(241, 245, 249));
  setFont(8, 'bold', rgb(15, 23, 42));
  const vnr = data.vorgangsnr ? `Vorgangsnr.: ${data.vorgangsnr}` : 'Entwurf';
  doc.text(vnr, MARGIN + 4, y + 6.5);
  setFont(8, 'normal', rgb(100, 116, 139));
  doc.text((data.anbahnungsdaten.sparten ?? []).map(s => s.sparte || '—').join(', '), W - MARGIN - 4, y + 6.5, { align: 'right' });

  y += 16;

  const COL2 = COL / 2 - 4;
  const col1x = MARGIN;
  const col2x = MARGIN + COL / 2 + 4;

  const sectionTitle = (title: string, x: number, yy: number): number => {
    setFont(9, 'bold', rgb(0, 97, 44));
    doc.text(title.toUpperCase(), x, yy);
    doc.setDrawColor(0, 97, 44);
    doc.line(x, yy + 1.5, x + COL2, yy + 1.5);
    return yy + 7;
  };

  const field = (label: string, value: string, x: number, yy: number): number => {
    setFont(7.5, 'normal', rgb(100, 116, 139));
    doc.text(label, x, yy);
    setFont(8.5, 'normal', rgb(15, 23, 42));
    doc.text(value || '—', x, yy + 4.5);
    return yy + 10;
  };

  // Col 1
  let y1 = sectionTitle('Versicherungsnehmer', col1x, y);
  const vn = data.interessent;
  y1 = field('Unternehmen', `${vn.name}${vn.firmierung ? ' ' + vn.firmierung : ''}`, col1x, y1);
  y1 = field('Anschrift', `${vn.strasse} ${vn.hausnummer}, ${vn.plz} ${vn.ort}`, col1x, y1);
  y1 += 4;
  y1 = sectionTitle('Vertriebspartner', col1x, y1);
  const vp = data.vertriebspartner;
  y1 = field('Name', `${vp.name}${vp.firmierung ? ' ' + vp.firmierung : ''}`, col1x, y1);
  y1 = field('Nr.', vp.nummer || '—', col1x, y1);
  y1 = field('Anschrift', `${vp.strasse} ${vp.hausnummer}, ${vp.plz} ${vp.ort}`, col1x, y1);

  // Col 2
  let y2 = sectionTitle('Vertragsdaten', col2x, y);
  const ab = data.anbahnungsdaten;
  y2 = field('Sparte(n)', (ab.sparten ?? []).map(s => `${s.sparte || '—'}${s.betriebsart ? ' · ' + s.betriebsart : ''}`).join(', '), col2x, y2);
  y2 = field('Vertragsbeginn', ab.vertragsbeginn || '—', col2x, y2);
  y2 = field('Laufzeit', ab.laufzeit ? `${ab.laufzeit} Jahr${ab.laufzeit !== '1' ? 'e' : ''}` : '—', col2x, y2);
  y2 = field('Zeichnungsart', ab.zeichnungsart || '—', col2x, y2);
  if (ab.zeichnungsart === 'Beteiligungsgeschäft' && ab.beteiligungsgeschaeft.versichererName) {
    y2 = field('Führender Versicherer', ab.beteiligungsgeschaeft.versichererName, col2x, y2);
    y2 = field('Anteil / Führungsprovision', `${ab.beteiligungsgeschaeft.anteil}% / ${ab.beteiligungsgeschaeft.fuehrungsprovision}%`, col2x, y2);
  }

  y = Math.max(y1, y2) + 6;
  hLine(y);
  y += 8;

  // Risikokalkulation
  setFont(9, 'bold', rgb(0, 97, 44));
  doc.text('RISIKOKALKULATION', MARGIN, y);
  doc.setDrawColor(0, 97, 44);
  doc.line(MARGIN, y + 1.5, W - MARGIN, y + 1.5);
  y += 8;

  const kalk = data.risikokalkulation;
  const abs = calcVorschlagsbeitragssatz(kalk);
  const tableColW = COL / 2 - 2;

  const kalkRows: [string, string][] = [
    ['Wagniskennziffer', kalk.wagniskennziffern.map((w) => `${w.wkz} (${w.tarifbeitragssatz}‰)`).join(', ') || '—'],
    ['Risikogerechter Beitragssatz', kalk.risikogerechterBeitragssatz ? `${kalk.risikogerechterBeitragssatz} ‰` : '—'],
    ['Versicherungssumme', kalk.versicherungssumme ? `${kalk.versicherungssumme} EUR` : '—'],
    ['Grundbeitragssatz', kalk.grundbeitragssatz ? `${kalk.grundbeitragssatz} ‰` : '—'],
    ['Degression', kalk.degression ? `${kalk.degression} %` : '—'],
    ['Vorschlagsbeitragssatz', abs ? `${abs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ‰` : '—'],
  ];

  for (const [label, val] of kalkRows) {
    setFont(7.5, 'normal', rgb(100, 116, 139));
    doc.text(label, MARGIN, y);
    setFont(8, 'bold', rgb(15, 23, 42));
    doc.text(val, MARGIN + tableColW, y, { align: 'right' });
    y += 7;
  }

  y += 2;
  hLine(y);
  y += 8;

  // Beitragskalkulation
  setFont(9, 'bold', rgb(0, 97, 44));
  doc.text('BEITRAGSKALKULATION', MARGIN, y);
  doc.setDrawColor(0, 97, 44);
  doc.line(MARGIN, y + 1.5, W - MARGIN, y + 1.5);
  y += 9;

  // Table — column widths sum to 172 mm (fits COL=174)
  // [Unternehmen, Land, Jahresumsatz*, Nettobeitrag*, VSt., Bruttobeitrag*]  * = right-aligned
  const colWidths = [50, 22, 32, 28, 14, 26];
  const colRight = [false, false, true, true, false, true];
  const headers = ['Unternehmen / Belegenheit', 'Land', 'Jahresumsatz', 'Nettobeitrag', 'VSt.', 'Bruttobeitrag'];

  // Precompute left edge of each column
  const colX: number[] = [];
  let colCursor = MARGIN + 2;
  for (const w of colWidths) { colX.push(colCursor); colCursor += w; }

  const textX = (i: number) => colRight[i] ? colX[i] + colWidths[i] : colX[i];
  const alignOpt = (i: number) => colRight[i] ? ({ align: 'right' } as const) : ({} as const);

  // Table header
  drawRect(MARGIN, y, COL, 7, rgb(11, 20, 38));
  setFont(7, 'bold', rgb(255, 255, 255));
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], textX(i), y + 5, alignOpt(i));
  }
  y += 7;

  let totalNetto = 0;
  let totalBrutto = 0;

  for (const u of data.unternehmen) {
    const umsatz = parseFormattedNumber(u.jahresumsatz);
    const steuer = parseFormattedNumber(u.steuersatz);
    const mindest = parseFormattedNumber(u.mindestbeitrag);
    const netto = calcJahresnettobeitrag(umsatz, abs);
    const effNetto = mindest > 0 ? Math.max(netto, mindest) : netto;
    const brutto = calcJahresbruttobeitrag(effNetto, steuer);
    totalNetto += effNetto;
    totalBrutto += brutto;

    drawRect(MARGIN, y, COL, 14, rgb(248, 250, 252));
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, y + 14, W - MARGIN, y + 14);

    setFont(7.5, 'bold', rgb(15, 23, 42));
    doc.text(u.name || '—', colX[0], y + 5);
    setFont(7.5, 'normal', rgb(15, 23, 42));
    doc.text(u.land || '—', colX[1], y + 5);
    doc.text(umsatz ? umsatz.toLocaleString('de-DE') : '—', textX(2), y + 5, alignOpt(2));
    setFont(7.5, 'bold', rgb(15, 23, 42));
    doc.text(effNetto ? effNetto.toLocaleString('de-DE') + ' €' : '—', textX(3), y + 5, alignOpt(3));
    setFont(7.5, 'normal', rgb(100, 116, 139));
    doc.text(steuer ? steuer + ' %' : '—', colX[4], y + 5);
    setFont(7.5, 'bold', rgb(15, 23, 42));
    doc.text(brutto ? brutto.toLocaleString('de-DE') + ' €' : '—', textX(5), y + 5, alignOpt(5));

    setFont(6.5, 'normal', rgb(100, 116, 139));
    const belegenheitLabel = u.risikobelegenheit ? RISIKOBELEGENHEIT_LABELS[u.risikobelegenheit] : '';
    if (belegenheitLabel) doc.text(belegenheitLabel, MARGIN + 2, y + 11);
    y += 14;
  }

  // Total row — align Netto/Brutto values with their columns
  drawRect(MARGIN, y, COL, 12, rgb(0, 97, 44));
  setFont(8, 'bold', rgb(255, 255, 255));
  doc.text('Gesamtprämie', MARGIN + 2, y + 8);
  doc.text(totalNetto.toLocaleString('de-DE') + ' EUR', textX(3), y + 8, alignOpt(3));
  setFont(7, 'normal', rgb(191, 219, 254));
  doc.text('Netto', colX[3], y + 8);
  setFont(8, 'bold', rgb(255, 255, 255));
  doc.text(totalBrutto.toLocaleString('de-DE') + ' EUR', textX(5), y + 8, alignOpt(5));
  setFont(7, 'normal', rgb(191, 219, 254));
  doc.text('Brutto', colX[5], y + 8);
  y += 12 + 12;

  hLine(y);
  y += 8;

  setFont(7, 'normal', rgb(100, 116, 139));
  doc.text('Dieser Vorschlag ist unverbindlich und dient ausschließlich internen Kalkulationszwecken.', MARGIN, y);
  y += 5;
  doc.text('Es entfaltet keine rechtliche Bindungswirkung. Gültig für 30 Tage ab Erstellungsdatum.', MARGIN, y);

  setFont(7, 'normal', rgb(100, 116, 139));
  doc.text('Seite 1 von 1', W / 2, 290, { align: 'center' });

  const fileName = `Vorschlag_${data.vorgangsnr || 'Entwurf'}_${data.interessent.name || 'Interessent'}.pdf`
    .replace(/[^a-zA-Z0-9_\-.]/g, '_');
  doc.save(fileName);
};
