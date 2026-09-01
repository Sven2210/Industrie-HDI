import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { HochgeladenesDokument } from '../types/antrag';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Polyfill: pdf.js nutzt intern `for await (const x of readableStream)`, also asynchrone
// Iteration über ReadableStream. Safari unterstützt das erst ab Version 16.4 (März 2023) —
// in älteren Safari-Versionen fehlt ReadableStream.prototype[Symbol.asyncIterator] komplett.
if (typeof ReadableStream !== 'undefined' && !(ReadableStream.prototype as unknown as Record<symbol, unknown>)[Symbol.asyncIterator]) {
  (ReadableStream.prototype as unknown as Record<symbol, unknown>)[Symbol.asyncIterator] = async function* (this: ReadableStream) {
    const reader = this.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  };
}

export async function ladePdfDokument(dokument: HochgeladenesDokument): Promise<PDFDocumentProxy | null> {
  if (dokument.typ !== 'application/pdf') return null;
  const base64 = dokument.inhaltBase64.split(',')[1] ?? '';
  const binaer = atob(base64);
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
  // disableStream/disableAutoFetch: Safari unterstützt die von pdf.js genutzte
  // ReadableStream-API nicht vollständig — ganze Datei auf einmal laden umgeht das.
  return pdfjsLib.getDocument({ data: bytes, disableStream: true, disableAutoFetch: true }).promise;
}

// Einfache Extraktion in Zeichenreihenfolge des PDFs — ausreichend für eine
// layoutunabhängige Stichwortsuche über das gesamte Dokument.
export async function extrahierePlainText(dokument: HochgeladenesDokument): Promise<string> {
  try {
    const pdf = await ladePdfDokument(dokument);
    if (pdf) {
      let text = '';
      for (let seite = 1; seite <= pdf.numPages; seite++) {
        const page = await pdf.getPage(seite);
        const inhalt = await page.getTextContent();
        text += inhalt.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n';
      }
      return text;
    }

    if (dokument.typ.startsWith('text/')) {
      const base64 = dokument.inhaltBase64.split(',')[1] ?? '';
      return atob(base64);
    }

    return '';
  } catch (e) {
    console.error('[pdfLader] Textextraktion fehlgeschlagen für', dokument.dateiname, e);
    return '';
  }
}

// Layoutbewusste Extraktion: pdf.js liefert Textfragmente in interner Zeichenreihenfolge,
// nicht in Lesereihenfolge (problematisch bei mehrspaltigen Formularen). Über die
// Positionsdaten (transform-Matrix) je Textelement wird die Lesereihenfolge zeilenweise
// rekonstruiert (Zeilen nach Y absteigend sortiert, Wörter je Zeile nach X aufsteigend).
export async function extrahiereLayoutText(dokument: HochgeladenesDokument): Promise<string> {
  try {
    const pdf = await ladePdfDokument(dokument);
    if (!pdf) return '';

    let volltext = '';
    for (let seite = 1; seite <= pdf.numPages; seite++) {
      const page = await pdf.getPage(seite);
      const inhalt = await page.getTextContent();
      const items = inhalt.items.filter(
        (item): item is TextItem => 'str' in item && item.str.trim() !== ''
      );

      const zeilenSchluessel: number[] = [];
      const zeilen = new Map<number, { x: number; str: string }[]>();
      for (const item of items) {
        const y = Math.round(item.transform[5]);
        let schluessel = zeilenSchluessel.find((k) => Math.abs(k - y) <= 2);
        if (schluessel === undefined) {
          schluessel = y;
          zeilenSchluessel.push(schluessel);
        }
        if (!zeilen.has(schluessel)) zeilen.set(schluessel, []);
        zeilen.get(schluessel)!.push({ x: item.transform[4], str: item.str });
      }

      const zeilenText = [...zeilen.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, woerter]) => woerter.sort((a, b) => a.x - b.x).map((w) => w.str).join(' '));
      volltext += zeilenText.join('\n') + '\n\n';
    }
    return volltext;
  } catch (e) {
    console.error('[pdfLader] Layout-Textextraktion fehlgeschlagen für', dokument.dateiname, e);
    return '';
  }
}
