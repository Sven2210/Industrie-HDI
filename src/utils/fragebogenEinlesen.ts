import type { HochgeladenesDokument } from '../types/antrag';
import { extrahiereTextElemente } from './pdfLader';
import { liesFragebogen } from './fragebogenExtraktion';
import type { FragebogenFelder } from './fragebogenExtraktion';

export function dateiZuDokument(file: File): Promise<HochgeladenesDokument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        dateiname: file.name,
        groesse: file.size,
        typ: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
        inhaltBase64: reader.result as string,
        hochgeladenAm: new Date().toISOString(),
      });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function leseFragebogenAusDokument(dokument: HochgeladenesDokument): Promise<FragebogenFelder> {
  return liesFragebogen(await extrahiereTextElemente(dokument));
}
