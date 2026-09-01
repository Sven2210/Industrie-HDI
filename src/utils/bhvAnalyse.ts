import type { BhvAnalyseErgebnis, BhvKategorieErgebnis, BhvRisikoStufe, HochgeladenesDokument } from '../types/antrag';
import { extrahiereLayoutText } from './pdfLader';

/**
 * Bewertet den AXA-"Kurzfragebogen zur Ermittlung des allgemeinen Betriebs- und
 * Produkthaftpflichtrisikos" (BHV) — feste Regeln je Abschnitt, siehe jeweilige
 * begruendung-Texte in `bewerten()`.
 *
 * Wichtige Einschränkung: Aus reinem Fließtext lässt sich nicht zuverlässig auslesen,
 * welches Ja/Nein-Kontrollkästchen angekreuzt wurde (das ist nur ein visuelles Häkchen,
 * kein Textzeichen). Bei reinen Ja/Nein-Abschnitten kann daher nur erkannt werden, OB
 * der Abschnitt ausgefüllt wurde — nicht WAS konkret angekreuzt ist. Bei Freitext-/
 * Zahlenabschnitten (Vorversicherung, Export USA/Kanada, Reklamationen, Schadenverlauf
 * etc.) ist die Erkennung präziser, da die Antwort selbst als Text vorliegt.
 */

interface AbschnittConfig {
  id: string;
  titel: string;
  startAnker: RegExp;
  endAnker: RegExp | null;
  staticLabels: string[];
  bewerten: (abschnitt: string, staticLabels: string[]) => { stufe: BhvRisikoStufe; begruendung: string };
}

function normalisiere(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function schneideAbschnitt(text: string, startAnker: RegExp, endAnker: RegExp | null): string {
  const startMatch = startAnker.exec(text);
  if (!startMatch) return '';
  const startIndex = startMatch.index;
  const restText = text.slice(startIndex);
  if (!endAnker) return restText;
  const endMatch = endAnker.exec(restText);
  return endMatch ? restText.slice(0, endMatch.index) : restText;
}

function extraInhalt(abschnitt: string, staticLabels: string[]): string {
  let rest = abschnitt.toLowerCase();
  // Längste Labels zuerst entfernen: ein kurzes Label (z.B. "vorhanden?"), das Teilstring
  // eines längeren Labels ist, würde sonst zuerst greifen und den späteren, längeren
  // Treffer zerstören (das längere Label passt dann nicht mehr als zusammenhängender String).
  const sortiert = [...staticLabels].sort((a, b) => b.length - a.length);
  for (const label of sortiert) {
    rest = rest.split(label.toLowerCase()).join(' ');
  }
  // Formulareigene Nummerierungen (z.B. "2.1", "3.4") sind keine Nutzereingabe, sondern
  // reine Gliederungsmarker — als Rauschen ausfiltern.
  rest = rest.replace(/\b\d{1,2}\.\d\b/g, ' ');
  const bereinigt = normalisiere(rest.replace(/[^a-zäöüß0-9%.,]/gi, ' '));
  // Isolierte Einzelzeichen (z.B. ein angekreuztes Kästchen, das als "x" extrahiert wird)
  // sind kein inhaltlicher Beleg für eine Antwort — nur zusammenhängende Wörter/Zahlen zählen.
  return bereinigt
    .split(' ')
    .filter((wort) => wort.length > 1)
    .join(' ');
}

function istAusgefuellt(abschnitt: string, staticLabels: string[], minLaenge = 12): boolean {
  return extraInhalt(abschnitt, staticLabels).length > minLaenge;
}

function enthaeltBetrag(abschnitt: string): boolean {
  // Deutsche Zahlenformate können mehrere Tausendertrennzeichen enthalten
  // (z.B. "12.500.000 Euro") — [.,]? erlaubt nur eines, daher (?:[.,]\d+)*.
  return /\d+(?:[.,]\d+)*\s*(euro|€|mio)/i.test(abschnitt);
}

// Nur auf bereits von Label-Text bereinigten Inhalt (extraInhalt) anwenden: die
// Formularvordrucke enthalten selbst deutsch formatierte Beträge (z.B. "25.000,– Euro"
// als Auswahloption), die auf dem Rohtext fälschlich als Nutzereingabe erkannt würden.
function enthaeltGrossbetrag(text: string): boolean {
  return /\b\d{1,3}(?:[.,]\d{3})+\b/.test(text);
}

function enthaeltJahr(abschnitt: string): boolean {
  return /\b(19|20)\d{2}\b/.test(abschnitt);
}

const ABSCHNITTE: AbschnittConfig[] = [
  {
    id: 'betriebsgefahren',
    titel: 'Allgemeine Betriebsgefahren',
    startAnker: /\b2\.1\b/,
    endAnker: /3\.\s*produktions/i,
    staticLabels: [
      'sind nicht zulassungs- und nicht versicherungspflichtige fahrzeuge',
      'hub- und gabelstapler, zugmaschinen', 'vorhanden?', 'wenn ja, art und anzahl?',
      'sind anschlussgleise zur deutschen bahn ag oder sonstigen eisenbahnbetrieben vorhanden?',
      'sind betriebsräume oder -grundstücke gemietet?', 'wenn ja, auf wievielen grundstücken?',
      'werden montage-, demontage-, wartungs- oder reparaturarbeiten auf fremden grundstücken',
      '(bei kunden) ausgeführt?',
      'wenn ja, welche produkte/anlagen werden montiert, demontiert, gewartet oder repariert?',
      '(bitte genaue bezeichnung)', 'ja', 'nein', 'z.b.', 'betriebsgefahren',
    ],
    bewerten: (abschnitt, staticLabels) => {
      if (!istAusgefuellt(abschnitt, staticLabels)) {
        return { stufe: 'unbeantwortet', begruendung: 'Abschnitt im Dokument nicht ausgefüllt.' };
      }
      return {
        stufe: 'niedrig',
        begruendung: 'Abschnitt ausgefüllt. Welches Kontrollkästchen (ja/nein) angekreuzt wurde, lässt sich aus dem Dokumenttext nicht zuverlässig auslesen — bitte Angaben manuell prüfen.',
      };
    },
  },
  {
    id: 'produktion',
    titel: 'Produktions-/Lieferungsprogramm',
    startAnker: /3\.\s*produktions/i,
    endAnker: /4\.\s*sonstige/i,
    staticLabels: [
      'bitte liefern sie uns detaillierte angaben über ihr produktions-, vertriebs- und sonstiges tätigkeitsprogramm mit',
      'umsatzanteilen (bitte prospekte und produktbeschreibungen beifügen!) (zutreffendes ankreuzen und ergänzen)',
      'herstellung von:', 'ergänzende betriebsbeschreibung:', 'vergabe von lizenzen für:',
      'handel mit/import von:', 'lohnverarbeitung (s. ziffer 3.4)', 'sonstiges', 'umsatzanteil', '%',
      'liefern sie an endverbraucher und/oder händler und/oder weiterverarbeitende industrie/gewerbe?',
      'welche verwendung finden die produkte bei den abnehmern?',
      'werden die produkte von anderen unternehmen so weiterverarbeitet,',
      'dass durch verbindung, vermischung oder verarbeitung ein neues produkt entsteht?',
      'werden die produkte von anderen unternehmen weiterver- oder bearbeitet, ohne dass sie mit anderen',
      'produkten verbunden, vermischt oder verarbeitet werden, z.b. veredelung, feinbearbeitung?',
      'werden die erzeugnisse von anderen unternehmen eingebaut, angebracht oder verlegt?',
      'werden die erzeugnisse von ihnen selbst oder in ihrem auftrag eingebaut oder montiert?',
      'übernehmen sie die montageüberwachung oder -beratung?',
      'produzieren, liefern, montieren oder warten sie maschinen, mit denen andere erzeugnisse hergestellt,',
      'bearbeitet oder verarbeitet werden?', 'sind produkte für die auto-, luftfahrt- oder wasserfahrzeugindustrie bestimmt?',
      'wenn ja, um welche produkte handelt es sich?', 'sichern sie ihren produkten bestimmte eigenschaften',
      '(z.b. farbechtheit etc.) zu?', 'wenn ja, welche eigenschaftszusicherung für welche produkte?',
      'sind sie als lohnverarbeiter tätig?', 'wenn ja, art der tätigkeit (z.b. veredelung)?',
      'beauftragen sie subunternehmer?', 'wenn ja, mit welchen tätigkeiten?',
      'wenn ja, verlangen sie von den subunternehmern vor der beauftragung den nachweis einer haftpflichtversicherung?',
      'werden gesetzliche gewährleistungsfristen verlängert?', 'wenn ja, wie lange?', 'ja', 'nein',
      'produktions-/', 'lieferungs-', 'programm',
    ],
    bewerten: (abschnitt, staticLabels) => {
      const gefahrenbranche = /(auto|luftfahrt|wasserfahrzeug)/i.test(extraInhalt(abschnitt, staticLabels));
      if (gefahrenbranche) {
        return {
          stufe: 'hoch',
          begruendung: 'Angaben deuten auf Produkte für die Auto-, Luftfahrt- oder Wasserfahrzeugindustrie hin — Branchen mit erfahrungsgemäß erhöhtem Produkthaftpflichtrisiko.',
        };
      }
      if (!istAusgefuellt(abschnitt, staticLabels, 20)) {
        return { stufe: 'unbeantwortet', begruendung: 'Abschnitt im Dokument nicht ausgefüllt.' };
      }
      return {
        stufe: 'niedrig',
        begruendung: 'Abschnitt ausgefüllt, keine der bekannten Risikobranchen (Auto/Luftfahrt/Wasserfahrzeug) erkannt.',
      };
    },
  },
  {
    id: 'sonstige-risiken',
    titel: 'Sonstige zu versichernde Risiken',
    startAnker: /4\.\s*sonstige/i,
    endAnker: /5\.\s*exportrisiken/i,
    staticLabels: [
      'strahlenschäden aus deckungsvorsorgefreiem umgang mit radioaktiven stoffen, röntgenapparaten,',
      'laser- und maserstrahlen (bei deckungsvorsorgepflichtigem umgang siehe besonderen fragebogen 1.20.073)',
      'umweltschaden-regressrisiko (siehe besonderen fragebogen 1.20.531)',
      'das umweltschaden-risiko (siehe besonderen fragebogen 1.20.531)', 'ja', 'nein',
      'zu versichernde', 'risiken', 'sonstige', '21003245', '1.14', '1.20.519',
    ],
    bewerten: (abschnitt, staticLabels) => {
      if (!istAusgefuellt(abschnitt, staticLabels)) {
        return { stufe: 'unbeantwortet', begruendung: 'Abschnitt im Dokument nicht ausgefüllt.' };
      }
      return {
        stufe: 'niedrig',
        begruendung: 'Abschnitt ausgefüllt. Welches Kontrollkästchen (ja/nein) angekreuzt wurde, lässt sich aus dem Dokumenttext nicht zuverlässig auslesen — bitte Angaben manuell prüfen.',
      };
    },
  },
  {
    id: 'export-weltweit',
    titel: 'Exportrisiken: weltweit ohne USA/Kanada',
    startAnker: /5\.\s*exportrisiken/i,
    endAnker: /6\.\s*exportrisiken/i,
    staticLabels: [
      'bitte beachten: auslandsrisiken nur usa/kanada s. pos. 6!', 'exportieren sie in die eu?',
      'exportieren sie in andere länder?', 'haben sie niederlassungen (z.b. verkaufsbüro) im ausland?',
      '(wenn ja, siehe besonderen fragebogen)', 'ja', 'nein',
      'weltweit ohne', 'usa/kanada', 'usa kanada', 'exportrisiken',
    ],
    bewerten: (abschnitt, staticLabels) => {
      if (!istAusgefuellt(abschnitt, staticLabels)) {
        return { stufe: 'unbeantwortet', begruendung: 'Abschnitt im Dokument nicht ausgefüllt.' };
      }
      return {
        stufe: 'niedrig',
        begruendung: 'Abschnitt ausgefüllt. Welches Kontrollkästchen (ja/nein) angekreuzt wurde, lässt sich aus dem Dokumenttext nicht zuverlässig auslesen — bitte Angaben manuell prüfen.',
      };
    },
  },
  {
    id: 'export-usa-kanada',
    titel: 'Exportrisiken: nur USA/Kanada',
    startAnker: /6\.\s*exportrisiken/i,
    endAnker: /7\.\s*quantitative/i,
    staticLabels: [
      'exportieren sie in die usa und nach kanada?', 'wenn ja, seit wann?', 'produkt', 'umsatz in mio', 'jahr',
      'haben sie niederlassungen in den usa oder in kanada? (wenn ja, siehe besonderen fragebogen)',
      'ja', 'nein', 'euro',
    ],
    bewerten: (abschnitt) => {
      if (enthaeltBetrag(abschnitt)) {
        return {
          stufe: 'hoch',
          begruendung: 'Angaben zu Produkt/Umsatz im USA/Kanada-Export gefunden — dort gilt erfahrungsgemäß ein deutlich erhöhtes Haftungsrisiko (u.a. Klagerisiko, Schadenshöhen).',
        };
      }
      return { stufe: 'unbeantwortet', begruendung: 'Keine Export-Angaben (Produkt/Umsatz) zu USA/Kanada im Dokument gefunden.' };
    },
  },
  {
    id: 'quantitative-angaben',
    titel: 'Quantitative Angaben zur Beitragsermittlung',
    startAnker: /7\.\s*quantitative/i,
    endAnker: /gesellschaft\s+wer hat gekündigt/i,
    staticLabels: [
      'gesamtumsatz', 'ohne mehrwertsteuer', 'umsatzanteile', 'umsatz mit firmen gem. 1.2',
      'montage-, demontage-, reparatur-,', 'wartungsarbeiten bei dritten', 'exporte ohne usa/kanada',
      'anteilige umsätze aus:', 'beauftragung von subunternehmen', 'lizenzvergabe',
      'exporte in die usa/kanada', '(übertrag aus pos. 6)', 'euro',
    ],
    bewerten: (abschnitt, staticLabels) => {
      if (!enthaeltBetrag(abschnitt) && !enthaeltGrossbetrag(extraInhalt(abschnitt, staticLabels))) {
        return { stufe: 'unbeantwortet', begruendung: 'Keine Umsatzangaben im Dokument gefunden.' };
      }
      return { stufe: 'niedrig', begruendung: 'Umsatzangaben vorhanden, keine Auffälligkeit ohne Vergleichswerte ableitbar.' };
    },
  },
  {
    id: 'vorversicherung',
    titel: 'Vorversicherung',
    startAnker: /gesellschaft\s+wer hat gekündigt/i,
    endAnker: /gewünschte für bearbeitungsschäden/i,
    staticLabels: [
      'gesellschaft', 'wer hat gekündigt?', 'vereinbarte deckungssummen', 'ablauf des vertrages',
    ],
    bewerten: (abschnitt, staticLabels) => {
      const versichererGekuendigt = /\bversicherer\b/i.test(abschnitt) && !/versicherungsnehmer/i.test(abschnitt.match(/\bversicherer\b[^.]*/i)?.[0] ?? '');
      if (versichererGekuendigt) {
        return {
          stufe: 'hoch',
          begruendung: 'Angabe deutet darauf hin, dass der Vorversicherer gekündigt hat — automatisch als hohes Risiko eingestuft.',
        };
      }
      if (!istAusgefuellt(abschnitt, staticLabels, 25)) {
        return { stufe: 'unbeantwortet', begruendung: 'Keine Angaben zu einer Vorversicherung im Dokument gefunden.' };
      }
      return { stufe: 'niedrig', begruendung: 'Vorversicherung angegeben, keine Kündigung durch den Versicherer erkannt.' };
    },
  },
  {
    id: 'deckungssummen',
    titel: 'Gewünschte Deckungssummen/Selbstbeteiligungen',
    startAnker: /gewünschte für bearbeitungsschäden/i,
    endAnker: /welche selbstbeteiligung soll vereinbart werden/i,
    staticLabels: [
      'für personenschäden', 'für sachschäden', 'pauschal für personen', 'und sachschäden',
      'für bearbeitungsschäden', 'im rahmen der', 'sachschaden', 'deckungssumme/', 'für feuerschäden an',
      'gemieteten gebäuden', 'sb:', 'euro',
    ],
    bewerten: (abschnitt, staticLabels) => {
      if (!enthaeltBetrag(abschnitt) && !enthaeltGrossbetrag(extraInhalt(abschnitt, staticLabels))) {
        return { stufe: 'unbeantwortet', begruendung: 'Keine gewünschten Deckungssummen im Dokument gefunden.' };
      }
      return { stufe: 'niedrig', begruendung: 'Deckungssummen angegeben, keine Auffälligkeit ohne Vergleichswerte ableitbar.' };
    },
  },
  {
    id: 'selbstbeteiligung-produkt',
    titel: 'Selbstbeteiligung/Produkthaftpflichtrisiko',
    startAnker: /welche selbstbeteiligung soll vereinbart werden/i,
    endAnker: /11\.\s*reklama/i,
    staticLabels: [
      'welche selbstbeteiligung soll vereinbart werden?', 'generell 10 % mind. 750,– euro, max 25.000,– euro',
      'andere:', 'beteiligung/', 'produkthaft-', 'pflichtrisiko',
    ],
    bewerten: (abschnitt, staticLabels) => {
      if (!istAusgefuellt(abschnitt, staticLabels) && !enthaeltGrossbetrag(extraInhalt(abschnitt, staticLabels))) {
        return { stufe: 'unbeantwortet', begruendung: 'Keine Angabe zur gewünschten Selbstbeteiligung im Dokument gefunden.' };
      }
      return {
        stufe: 'niedrig',
        begruendung: 'Angabe zur Selbstbeteiligung vorhanden. Ob die generelle oder eine abweichende Selbstbeteiligung gewählt wurde, lässt sich aus dem Dokumenttext nicht zuverlässig auslesen.',
      };
    },
  },
  {
    id: 'reklamationen',
    titel: 'Reklamationen',
    startAnker: /11\.\s*reklama/i,
    endAnker: /schadenverlauf in den letzten 3 jahren/i,
    staticLabels: [
      'ab einer förderungshöhe von 2.500,– euro', 'jahr', 'höhe der', 'art der reklamation', 'forderung',
    ],
    bewerten: (abschnitt) => {
      if (/\bkeine\b/i.test(abschnitt) && !enthaeltBetrag(abschnitt) && !enthaeltJahr(abschnitt)) {
        return { stufe: 'niedrig', begruendung: 'Im Dokument wird explizit vermerkt, dass keine Reklamationen vorliegen.' };
      }
      if (enthaeltBetrag(abschnitt) || enthaeltJahr(abschnitt)) {
        return { stufe: 'hoch', begruendung: 'Es sind konkrete Reklamationseinträge (Jahr/Forderungshöhe) im Dokument vermerkt.' };
      }
      return { stufe: 'unbeantwortet', begruendung: 'Abschnitt im Dokument nicht ausgefüllt.' };
    },
  },
  {
    id: 'schadenverlauf',
    titel: 'Schadenverlauf',
    startAnker: /schadenverlauf in den letzten 3 jahren/i,
    endAnker: /wichtig für den/i,
    staticLabels: [
      'bei schäden in usa/kanada bitte einzelaufstellung mit', 'genauer beschreibung der ursache/des herganges',
      'höhe der forderung (ab 15.000,– euro) und der entschädigung beifügen!', 'ursache des schadens',
      'forderung', 'zahlung', 'jahr',
    ],
    bewerten: (abschnitt) => {
      if (/\bkein(e|er)?\s+schaden/i.test(abschnitt) && !enthaeltBetrag(abschnitt) && !enthaeltJahr(abschnitt)) {
        return { stufe: 'niedrig', begruendung: 'Im Dokument wird explizit vermerkt, dass kein Schadenverlauf vorliegt.' };
      }
      if (enthaeltBetrag(abschnitt) || enthaeltJahr(abschnitt)) {
        return { stufe: 'hoch', begruendung: 'Es sind konkrete Schadenfälle (Jahr/Forderung/Zahlung) im Dokument vermerkt.' };
      }
      return { stufe: 'unbeantwortet', begruendung: 'Abschnitt im Dokument nicht ausgefüllt.' };
    },
  },
];

export async function analysiereBhvFragebogen(dokument: HochgeladenesDokument): Promise<BhvAnalyseErgebnis> {
  const text = normalisiere(await extrahiereLayoutText(dokument));

  const kategorien: BhvKategorieErgebnis[] = ABSCHNITTE.map((config) => {
    const abschnitt = text ? schneideAbschnitt(text, config.startAnker, config.endAnker) : '';
    const { stufe, begruendung } = abschnitt
      ? config.bewerten(abschnitt, config.staticLabels)
      : { stufe: 'unbeantwortet' as BhvRisikoStufe, begruendung: 'Abschnitt im Dokument nicht gefunden oder nicht auslesbar (z.B. gescanntes Dokument ohne Textebene).' };
    return { id: config.id, titel: config.titel, stufe, begruendung };
  });

  return {
    kategorien,
    analysiertAm: new Date().toISOString(),
    dokumentId: dokument.id,
    dokumentName: dokument.dateiname,
  };
}
