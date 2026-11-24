import type { FragebogenFelder } from './fragebogenExtraktion';
import { fuehreZusammen } from './fragebogenKiMerge';
import { kiVerfuegbar } from './fragebogenKi';
import type { KombiAuslese } from './fragebogenKi';

// Foto/Scan einer Notiz (z. B. handschriftliche Adresse) → Angaben für den Antrag. Das Bild wird
// im Browser verkleinert (Handyfotos sind oft 5–10 MB) und vom Backend an den adesso AI Hub gegeben.

const ERLAUBTE_TYPEN = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_KANTE = 1800;

export function istBild(file: File): boolean {
  return ERLAUBTE_TYPEN.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
}

// Skaliert auf höchstens 1800 px Kantenlänge und speichert als JPEG. EXIF-Drehung wird berücksichtigt.
export async function bildVorbereiten(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const faktor = Math.min(1, MAX_KANTE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * faktor);
  canvas.height = Math.round(bitmap.height * faktor);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Das Bild konnte nicht verarbeitet werden.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

export async function leseNotizMitKi(bildDataUrl: string): Promise<{ felder: Record<string, unknown>; modell: string }> {
  let res: Response;
  try {
    res = await fetch('/api/ki/notiz-lesen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bild: bildDataUrl }),
    });
  } catch {
    throw new Error('Der Server ist nicht erreichbar.');
  }
  const body = await res.json().catch(() => null);
  // 404 heißt: der laufende Server ist älter als diese Funktion
  if (res.status === 404) throw new Error('Der Server kennt diese Funktion noch nicht — bitte den Server neu starten (bash start-ki.sh).');
  if (!res.ok) throw new Error(body?.fehler?.meldung ?? `Fehler ${res.status} beim Lesen des Bildes.`);
  if (!body?.felder) throw new Error('Unerwartete Antwort vom Server.');
  return { felder: body.felder, modell: body.modell ?? '' };
}

// Liest ein Foto per KI. Fehler werden als Exception gemeldet — ein Foto lässt sich ohne KI nicht lesen.
export async function leseNotiz(file: File): Promise<KombiAuslese> {
  if (!(await kiVerfuegbar())) {
    throw new Error('Fotos können nur mit dem adesso AI Hub gelesen werden — der ist hier nicht eingerichtet. Bitte ein PDF verwenden oder den Vorgang ohne Dokument starten.');
  }
  const bild = await bildVorbereiten(file);
  const { felder: kiFelder } = await leseNotizMitKi(bild);
  const leer: FragebogenFelder = { textVorhanden: false, mitversicherte: [] };
  const { felder, kiFelder: schluessel } = fuehreZusammen(leer, kiFelder);
  return { regelFelder: leer, felder, kiFelder: schluessel };
}
