export type Firmierung = 'GbR' | 'OHG' | 'KG' | 'GmbH' | 'UG' | 'AG' | 'Limited' | 'SE';

export interface Wagnisanschrift {
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  land: string;
}

export type RisikoAmpel = 'gruen' | 'gelb' | 'rot' | 'unbekannt';

export interface SanktionsTreffer {
  quelle: 'EU' | 'UN';
  name: string;
  typ: 'Person' | 'Organisation';
  regelung?: string;
}

export interface SanktionsAnalyse {
  ampel: RisikoAmpel;
  treffer: SanktionsTreffer[];
  geprueftAm: string;
  gepruefteFirma: string;
  geprueftePersonen: string[];
  fehler?: string;
}

export interface InsolvenzEintrag {
  aktenzeichen: string;
  bekanntmachungsdatum: string;
  art: string;
  gericht: string;
}

export interface BundesanzeigerAnalyse {
  ampel: RisikoAmpel;
  insolvenzeintraege: InsolvenzEintrag[];
  jahresabschlussStatus: 'aktuell' | 'fehlt' | 'unbekannt';
  letzterJahresabschluss?: string;
  fehler?: string;
  geprueftAm: string;
  gepruefteFirma: string;
}

export interface NaturgefahrBewertung {
  ampel: RisikoAmpel;
  score: number;
  details: Record<string, string>;
}

export interface RisikoAnalyse {
  lat: number;
  lon: number;
  gesamtAmpel: RisikoAmpel;
  hochwasser: NaturgefahrBewertung;
  sturm: NaturgefahrBewertung;
  erdbeben: NaturgefahrBewertung;
  hagel: NaturgefahrBewertung;
  waldbrand: NaturgefahrBewertung;
  schnee: NaturgefahrBewertung;
  analysiertAm: string;
}

export interface UmweltrisikoKategorie {
  ampel: RisikoAmpel;
  begruendung: string;
}

export interface UmweltrisikoAnalyse {
  ampel: RisikoAmpel;
  branchenerkannt: boolean;
  luftemissionen: UmweltrisikoKategorie;
  gewaesserBoden: UmweltrisikoKategorie;
  abfall: UmweltrisikoKategorie;
  laerm: UmweltrisikoKategorie;
  brandExplosion: UmweltrisikoKategorie;
  analysiertAm: string;
}
export interface HochgeladenesDokument {
  id: string;
  dateiname: string;
  groesse: number;
  typ: string;
  inhaltBase64: string;
  hochgeladenAm: string;
}

export type Regelwerk = 'betriebshaftpflicht';

export type BhvRisikoStufe = 'niedrig' | 'mittel' | 'hoch' | 'unbeantwortet';

export interface BhvKategorieErgebnis {
  id: string;
  titel: string;
  stufe: BhvRisikoStufe;
  begruendung: string;
}

export interface BhvAnalyseErgebnis {
  kategorien: BhvKategorieErgebnis[];
  analysiertAm: string;
  dokumentId: string;
  dokumentName: string;
}

export type NaturgefahrKategorie = 'hochwasser' | 'sturm' | 'erdbeben' | 'hagel' | 'waldbrand' | 'schnee';
export type UmweltrisikoKategorieKey = 'luftemissionen' | 'gewaesserBoden' | 'abfall' | 'laerm' | 'brandExplosion';

export interface DokumentHinweis {
  bereich: 'naturgefahr' | 'umweltrisiko';
  kategorie: NaturgefahrKategorie | UmweltrisikoKategorieKey;
  ausschnitt: string;
  quelle: string;
  dokumentId: string;
}

export interface AnalyseDaten {
  regelwerk?: Regelwerk;
  dokumente: HochgeladenesDokument[];
  hinweise?: DokumentHinweis[];
  bhvErgebnis?: BhvAnalyseErgebnis;
}

export type Sparte = 'Haftpflicht' | 'Transport' | 'Technische Versicherung';
export type Zeichnungsart = 'Alleinzeichnung' | 'Beteiligungsgeschäft';
export type VorgangStatus = 'entwurf' | 'in Prüfung' | 'rückmeldung benötigt' | 'freigabe angefordert' | 'aktiv' | 'abgelehnt';
export type Risikobelegenheit = 'DE_ex_USCAN' | 'FOS' | 'LoPo' | 'USCAN' | 'Sonstige';
export type RisikoRelevanz = 'niedrig' | 'hoch' | 'nein' | 'ja' | 'nicht vereinbart' | '';

export interface Ansprechpartner {
  name: string;
  vorname: string;
  email: string;
  telefon: string;
}

export interface Interessent {
  name: string;
  firmierung: Firmierung | '';
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  adresszusatz: string;
  ansprechpartner: Ansprechpartner;
}

export interface Vertriebspartner {
  name: string;
  firmierung: Firmierung | '';
  nummer: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  adresszusatz: string;
  ansprechpartner: Ansprechpartner;
}

export interface Beteiligungsgeschaeft {
  anteil: string;
  versichererName: string;
  unternehmenskennziffer: string;
  fuehrungsprovision: string;
}

export interface SparteEntry {
  id: string;
  sparte: Sparte | '';
  betriebsart: string;
}

export interface Anbahnungsdaten {
  eingangsdatum: string;
  anbahnungsfrist: string;
  vertragsbeginn: string;
  laufzeit: string;
  sparten: SparteEntry[];
  betriebsbeschreibung: string;
  zeichnungsart: Zeichnungsart | '';
  beteiligungsgeschaeft: Beteiligungsgeschaeft;
}

export interface RisikocheckItem {
  id: string;
  label: string;
  options: RisikoRelevanz[];
  value: RisikoRelevanz;
  anmerkungen: string;
  isCustom?: boolean;
  isCompliance?: boolean;
}

export interface WKZEntry {
  id: string;
  wkz: string;
  tarifbeitragssatz: string;
}

export interface ZuAbschlag {
  id: string;
  prozent: string;
  bezeichnung: string;
}

export interface Risikokalkulation {
  wagniskennziffern: WKZEntry[];
  begruendung: string;
  risikogerechterBeitragssatz: string;
  versicherungssumme: string;
  zuschlaegeVS: ZuAbschlag[];
  abschlaegeVS: ZuAbschlag[];
  grundbeitragssatz: string;
  degression: string;
  zuschlaegeRBS: ZuAbschlag[];
  abschlaegeRBS: ZuAbschlag[];
}

export interface Unternehmen {
  id: string;
  risikobelegenheit: Risikobelegenheit | '';
  name: string;
  land: string;
  jahresumsatz: string;
  steuersatz: string;
  mindestbeitrag: string;
}

export interface WeiterleitungsEintrag {
  id: string;
  typ: 'weiterleitung';
  erstelltAm: string;
  erstelltVonId: string;
  erstelltVonName: string;
  empfaengerId: string;
  empfaengerName: string;
  empfaengerRolle: 'spezialist' | 'admin';
  grund: string;
}

export interface VertriebsRueckmeldungEintrag {
  id: string;
  typ: 'vertriebsrueckmeldung';
  erstelltAm: string;
  erstelltVonId: string;
  erstelltVonName: string;
  offeneKategorien: string[];
  anmerkung: string;
}

export interface FreigabeErteiltEintrag {
  id: string;
  typ: 'freigabe_erteilt';
  erstelltAm: string;
  erstelltVonId: string;
  erstelltVonName: string;
}

export type WorkflowEintrag = WeiterleitungsEintrag | VertriebsRueckmeldungEintrag | FreigabeErteiltEintrag;

export interface AntragData {
  id: string;
  vorgangsnr?: string;
  status: VorgangStatus;
  underwriter?: string;
  interessent: Interessent;
  vertriebspartner: Vertriebspartner;
  wagnisanschrift: Wagnisanschrift;
  anbahnungsdaten: Anbahnungsdaten;
  risikocheck: RisikocheckItem[];
  risikokalkulation: Risikokalkulation;
  unternehmen: Unternehmen[];
  risikoAnalyse?: RisikoAnalyse;
  sanktionsAnalyse?: SanktionsAnalyse;
  bundesanzeigerAnalyse?: BundesanzeigerAnalyse;
  umweltrisikoAnalyse?: UmweltrisikoAnalyse;
  analyse?: AnalyseDaten;
  workflow?: WorkflowEintrag[];
  createdAt: string;
  updatedAt: string;
}

const emptyAnsprechpartner = (): Ansprechpartner => ({
  name: '', vorname: '', email: '', telefon: '',
});

export const createDefaultRisikocheck = (): RisikocheckItem[] => [
  { id: 'vorumsaetze', label: 'Vorumsätze', options: ['niedrig', 'hoch'], value: '', anmerkungen: '' },
  { id: 'us_exporte', label: 'Ausschluss US-Exporte', options: ['niedrig', 'hoch'], value: '', anmerkungen: '' },
  { id: 'kfz_akb', label: 'Gebrauch von Kfz/AKB Zusatzdeckung', options: ['niedrig', 'hoch'], value: '', anmerkungen: '' },
  { id: 'lohnherstellung', label: 'Lohnherstellung', options: ['nein', 'ja'], value: '', anmerkungen: '' },
  { id: 'mietsachschaeden', label: 'Mietsachschäden', options: ['niedrig', 'hoch'], value: '', anmerkungen: '' },
  { id: 'bleiausschluss', label: 'Bleiausschluss', options: ['nein', 'ja'], value: '', anmerkungen: '' },
  { id: 'umweltregress', label: 'Umweltregressrisiko', options: ['nein', 'ja'], value: '', anmerkungen: '' },
  { id: 'uhv_anlagen', label: 'UHV-Anlagen', options: ['nein', 'ja'], value: '', anmerkungen: '' },
  { id: 'usv', label: 'USV', options: ['niedrig', 'hoch'], value: '', anmerkungen: '' },
  { id: 'umweltrisiken_ausland', label: 'Umweltrisiken im Ausland', options: ['nein', 'ja'], value: '', anmerkungen: '' },
  { id: 'futtermittel', label: 'Futtermittel / EAN-Codierungen', options: ['nein', 'ja'], value: '', anmerkungen: '' },
  { id: 'ae_deckung', label: 'A&E-Deckung für Schienen- und Wasserfahrzeuge', options: ['nein', 'ja'], value: '', anmerkungen: '' },
  { id: 'rueckruf', label: 'Rückruf / Produktschutz', options: ['niedrig', 'hoch'], value: '', anmerkungen: '' },
  { id: 'el_anschluss', label: 'EL-Anschlussdeckung', options: ['niedrig', 'hoch', 'nicht vereinbart'], value: '', anmerkungen: '' },
  { id: 'auto_anschluss', label: 'Auto-Anschlussdeckung', options: ['niedrig', 'hoch', 'nicht vereinbart'], value: '', anmerkungen: '' },
  { id: 'offshore', label: 'Teile für Offshore-Anlagen', options: ['niedrig', 'hoch'], value: '', anmerkungen: '' },
  { id: 'baurisiken', label: 'Baurisiken', options: ['niedrig', 'hoch'], value: '', anmerkungen: '' },
  { id: 'sanktionsklausel', label: 'Sanktionsklausel geprüft', options: ['nein', 'ja'], value: 'nein', anmerkungen: '', isCompliance: true },
  { id: 'trb', label: 'Einschaltung TRB', options: ['nein', 'ja'], value: 'nein', anmerkungen: '', isCompliance: true },
];

const emptyWagnisanschrift = (): Wagnisanschrift => ({
  strasse: '', hausnummer: '', plz: '', ort: '', land: 'Deutschland',
});

export const initialAntragData = (): AntragData => ({
  id: Date.now().toString(),
  status: 'entwurf',
  interessent: {
    name: '', firmierung: '', strasse: '', hausnummer: '', plz: '', ort: '', adresszusatz: '',
    ansprechpartner: emptyAnsprechpartner(),
  },
  vertriebspartner: {
    name: '', firmierung: '', nummer: '', strasse: '', hausnummer: '', plz: '', ort: '', adresszusatz: '',
    ansprechpartner: emptyAnsprechpartner(),
  },
  wagnisanschrift: emptyWagnisanschrift(),
  anbahnungsdaten: {
    eingangsdatum: new Date().toLocaleDateString('de-DE'),
    anbahnungsfrist: '',
    vertragsbeginn: '',
    laufzeit: '',
    sparten: [{ id: '1', sparte: '', betriebsart: '' }],
    betriebsbeschreibung: '',
    zeichnungsart: 'Alleinzeichnung',
    beteiligungsgeschaeft: { anteil: '', versichererName: '', unternehmenskennziffer: '', fuehrungsprovision: '' },
  },
  risikocheck: createDefaultRisikocheck(),
  risikokalkulation: {
    wagniskennziffern: [{ id: '1', wkz: '', tarifbeitragssatz: '' }],
    begruendung: '',
    risikogerechterBeitragssatz: '',
    versicherungssumme: '',
    zuschlaegeVS: [],
    abschlaegeVS: [],
    grundbeitragssatz: '',
    degression: '',
    zuschlaegeRBS: [],
    abschlaegeRBS: [],
  },
  unternehmen: [{ id: '1', risikobelegenheit: '', name: '', land: 'Deutschland', jahresumsatz: '', steuersatz: '19', mindestbeitrag: '' }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/** Migrates AntragData from old schema (sparte/betriebsart strings) to new (sparten array). */
export const migrateAntragData = (data: AntragData): AntragData => {
  const ab = data.anbahnungsdaten as Anbahnungsdaten & { sparte?: string; betriebsart?: string };
  const migrated = !ab.sparten || ab.sparten.length === 0
    ? { ...data, anbahnungsdaten: { ...ab, sparten: [{ id: '1', sparte: (ab.sparte as Sparte | '') ?? '', betriebsart: ab.betriebsart ?? '' }] } }
    : data;
  return {
    ...migrated,
    wagnisanschrift: migrated.wagnisanschrift ?? emptyWagnisanschrift(),
    risikocheck: migrated.risikocheck ?? createDefaultRisikocheck(),
  };
};

export const RISIKOBELEGENHEIT_LABELS: Record<Risikobelegenheit, string> = {
  DE_ex_USCAN: 'Mitversichertes Unternehmen in DE (ex. USA/CAN)',
  FOS: 'Mitversichertes Unternehmen FOS (Freedom of Service) (ex. USA/CAN)',
  LoPo: 'Mitversichertes Unternehmen mit LoPo (Lokale Police) (ex. USA/CAN)',
  USCAN: 'Mitversichertes Unternehmen Umsätze nur Exporte USA/CAN',
  Sonstige: 'Sonstige Berechnungspositionen',
};

export const MOCK_VORGAENGE: AntragData[] = [
  {
    id: 'mock-1',
    vorgangsnr: '95137',
    status: 'aktiv',
    underwriter: 'Brandt',
    interessent: {
      name: 'adesso SE', firmierung: 'SE', strasse: 'Adessoplatz', hausnummer: '1',
      plz: '44269', ort: 'Dortmund', adresszusatz: '',
      ansprechpartner: emptyAnsprechpartner(),
    },
    vertriebspartner: {
      name: 'Funk Gruppe GmbH', firmierung: 'GmbH', nummer: '13579',
      strasse: 'Valentinskamp', hausnummer: '20', plz: '20354', ort: 'Hamburg', adresszusatz: '',
      ansprechpartner: emptyAnsprechpartner(),
    },
    anbahnungsdaten: {
      eingangsdatum: '28.03.2024', anbahnungsfrist: '27.04.2024',
      vertragsbeginn: '01.06.2025', laufzeit: '3',
      sparten: [
        { id: '1', sparte: 'Haftpflicht', betriebsart: 'Textilproduktion' },
        { id: '2', sparte: 'Transport', betriebsart: 'Luftfracht' },
      ],
      betriebsbeschreibung: 'IT-Dienstleistungsunternehmen mit Schwerpunkt auf Softwareentwicklung.',
      zeichnungsart: 'Beteiligungsgeschäft',
      beteiligungsgeschaeft: { anteil: '70', versichererName: 'Axa-Konzern AG', unternehmenskennziffer: '268457', fuehrungsprovision: '3' },
    },
    risikocheck: createDefaultRisikocheck(),
    risikokalkulation: {
      wagniskennziffern: [{ id: '1', wkz: '873647', tarifbeitragssatz: '3,5' }],
      begruendung: 'Anpassung aufgrund aktueller Schadenerfahrung.',
      risikogerechterBeitragssatz: '3,2',
      versicherungssumme: '10.000.000',
      zuschlaegeVS: [], abschlaegeVS: [],
      grundbeitragssatz: '3,2',
      degression: '15',
      zuschlaegeRBS: [],
      abschlaegeRBS: [{ id: '1', prozent: '20', bezeichnung: 'Vertriebsrabatt' }],
    },
    unternehmen: [
      { id: '1', risikobelegenheit: 'DE_ex_USCAN', name: 'adesso SE', land: 'Deutschland', jahresumsatz: '934.800.000', steuersatz: '19', mindestbeitrag: '1.700.000' },
      { id: '2', risikobelegenheit: 'LoPo', name: 'adesso Spanien, S.L', land: 'Spanien', jahresumsatz: '600.000', steuersatz: '8,15', mindestbeitrag: '850' },
    ],
    wagnisanschrift: { strasse: 'Adessoplatz', hausnummer: '1', plz: '44269', ort: 'Dortmund', land: 'Deutschland' },
    createdAt: '2024-03-28T09:00:00.000Z',
    updatedAt: '2024-04-10T14:30:00.000Z',
  },
  {
    id: 'mock-2', vorgangsnr: '123456', status: 'aktiv', underwriter: 'Brandt',
    interessent: { name: 'Textil OHG', firmierung: 'OHG', strasse: 'Musterstr.', hausnummer: '111', plz: '44269', ort: 'Dortmund', adresszusatz: '', ansprechpartner: emptyAnsprechpartner() },
    vertriebspartner: { name: 'Makler Meyer', firmierung: 'GmbH', nummer: '654321', strasse: 'Beispielstr.', hausnummer: '999', plz: '11111', ort: 'Beispielstadt', adresszusatz: '', ansprechpartner: emptyAnsprechpartner() },
    wagnisanschrift: { strasse: 'Musterstr.', hausnummer: '111', plz: '44269', ort: 'Dortmund', land: 'Deutschland' },
    anbahnungsdaten: { eingangsdatum: '01.01.2024', anbahnungsfrist: '31.01.2024', vertragsbeginn: '01.03.2024', laufzeit: '1', sparten: [{ id: '1', sparte: 'Haftpflicht', betriebsart: 'Textilproduktion' }], betriebsbeschreibung: '', zeichnungsart: 'Alleinzeichnung', beteiligungsgeschaeft: { anteil: '', versichererName: '', unternehmenskennziffer: '', fuehrungsprovision: '' } },
    risikocheck: createDefaultRisikocheck(),
    risikokalkulation: { wagniskennziffern: [{ id: '1', wkz: '', tarifbeitragssatz: '' }], begruendung: '', risikogerechterBeitragssatz: '', versicherungssumme: '', zuschlaegeVS: [], abschlaegeVS: [], grundbeitragssatz: '', degression: '', zuschlaegeRBS: [], abschlaegeRBS: [] },
    unternehmen: [{ id: '1', risikobelegenheit: 'DE_ex_USCAN', name: 'Textil OHG', land: 'Deutschland', jahresumsatz: '', steuersatz: '19', mindestbeitrag: '' }],
    createdAt: '2024-01-01T09:00:00.000Z', updatedAt: '2024-01-15T14:00:00.000Z',
  },
  {
    id: 'mock-3', vorgangsnr: '234567', status: 'in Prüfung', underwriter: 'Kessler',
    interessent: { name: 'Baustoffe GmbH', firmierung: 'GmbH', strasse: 'Industriestr.', hausnummer: '22', plz: '50667', ort: 'Köln', adresszusatz: '', ansprechpartner: emptyAnsprechpartner() },
    vertriebspartner: { name: 'Makler Schmitz', firmierung: 'GmbH', nummer: '765432', strasse: 'Handelsgasse', hausnummer: '5', plz: '50667', ort: 'Köln', adresszusatz: '', ansprechpartner: emptyAnsprechpartner() },
    wagnisanschrift: { strasse: 'Industriestr.', hausnummer: '22', plz: '50667', ort: 'Köln', land: 'Deutschland' },
    anbahnungsdaten: { eingangsdatum: '15.02.2024', anbahnungsfrist: '15.03.2024', vertragsbeginn: '01.05.2024', laufzeit: '2', sparten: [{ id: '1', sparte: 'Haftpflicht', betriebsart: 'Hochbau' }], betriebsbeschreibung: '', zeichnungsart: 'Alleinzeichnung', beteiligungsgeschaeft: { anteil: '', versichererName: '', unternehmenskennziffer: '', fuehrungsprovision: '' } },
    risikocheck: createDefaultRisikocheck(),
    risikokalkulation: { wagniskennziffern: [{ id: '1', wkz: '', tarifbeitragssatz: '' }], begruendung: '', risikogerechterBeitragssatz: '', versicherungssumme: '', zuschlaegeVS: [], abschlaegeVS: [], grundbeitragssatz: '', degression: '', zuschlaegeRBS: [], abschlaegeRBS: [] },
    unternehmen: [{ id: '1', risikobelegenheit: 'DE_ex_USCAN', name: 'Baustoffe GmbH', land: 'Deutschland', jahresumsatz: '', steuersatz: '19', mindestbeitrag: '' }],
    createdAt: '2024-02-15T09:00:00.000Z', updatedAt: '2024-03-01T14:00:00.000Z',
  },
  {
    id: 'mock-4', vorgangsnr: '345678', status: 'aktiv', underwriter: 'Lindner',
    interessent: { name: 'Luft- und Raumfahrt AG', firmierung: 'AG', strasse: 'Flugplatzstr.', hausnummer: '1', plz: '85356', ort: 'München', adresszusatz: '', ansprechpartner: emptyAnsprechpartner() },
    vertriebspartner: { name: 'Müller und Partner', firmierung: 'GmbH', nummer: '876543', strasse: 'Partnerstr.', hausnummer: '10', plz: '80335', ort: 'München', adresszusatz: '', ansprechpartner: emptyAnsprechpartner() },
    wagnisanschrift: { strasse: 'Flugplatzstr.', hausnummer: '1', plz: '85356', ort: 'München', land: 'Deutschland' },
    anbahnungsdaten: { eingangsdatum: '10.03.2024', anbahnungsfrist: '10.04.2024', vertragsbeginn: '01.06.2024', laufzeit: '3', sparten: [{ id: '1', sparte: 'Transport', betriebsart: 'Luftfracht' }], betriebsbeschreibung: '', zeichnungsart: 'Beteiligungsgeschäft', beteiligungsgeschaeft: { anteil: '50', versichererName: 'Allianz AG', unternehmenskennziffer: '123456', fuehrungsprovision: '5' } },
    risikocheck: createDefaultRisikocheck(),
    risikokalkulation: { wagniskennziffern: [{ id: '1', wkz: '', tarifbeitragssatz: '' }], begruendung: '', risikogerechterBeitragssatz: '', versicherungssumme: '', zuschlaegeVS: [], abschlaegeVS: [], grundbeitragssatz: '', degression: '', zuschlaegeRBS: [], abschlaegeRBS: [] },
    unternehmen: [{ id: '1', risikobelegenheit: 'DE_ex_USCAN', name: 'Luft- und Raumfahrt AG', land: 'Deutschland', jahresumsatz: '', steuersatz: '19', mindestbeitrag: '' }],
    createdAt: '2024-03-10T09:00:00.000Z', updatedAt: '2024-03-20T14:00:00.000Z',
  },
  {
    id: 'mock-5', vorgangsnr: '456789', status: 'abgelehnt', underwriter: 'Hartmann',
    interessent: { name: 'Autoteile KG', firmierung: 'KG', strasse: 'Werkstattweg', hausnummer: '7', plz: '70173', ort: 'Stuttgart', adresszusatz: '', ansprechpartner: emptyAnsprechpartner() },
    vertriebspartner: { name: 'Makler Weber', firmierung: 'GmbH', nummer: '987654', strasse: 'Maklergasse', hausnummer: '3', plz: '70173', ort: 'Stuttgart', adresszusatz: '', ansprechpartner: emptyAnsprechpartner() },
    wagnisanschrift: { strasse: 'Werkstattweg', hausnummer: '7', plz: '70173', ort: 'Stuttgart', land: 'Deutschland' },
    anbahnungsdaten: { eingangsdatum: '05.04.2024', anbahnungsfrist: '05.05.2024', vertragsbeginn: '', laufzeit: '1', sparten: [{ id: '1', sparte: 'Haftpflicht', betriebsart: 'Kfz-Teile / Autoteile' }], betriebsbeschreibung: '', zeichnungsart: 'Alleinzeichnung', beteiligungsgeschaeft: { anteil: '', versichererName: '', unternehmenskennziffer: '', fuehrungsprovision: '' } },
    risikocheck: createDefaultRisikocheck(),
    risikokalkulation: { wagniskennziffern: [{ id: '1', wkz: '', tarifbeitragssatz: '' }], begruendung: '', risikogerechterBeitragssatz: '', versicherungssumme: '', zuschlaegeVS: [], abschlaegeVS: [], grundbeitragssatz: '', degression: '', zuschlaegeRBS: [], abschlaegeRBS: [] },
    unternehmen: [{ id: '1', risikobelegenheit: 'DE_ex_USCAN', name: 'Autoteile KG', land: 'Deutschland', jahresumsatz: '', steuersatz: '19', mindestbeitrag: '' }],
    createdAt: '2024-04-05T09:00:00.000Z', updatedAt: '2024-04-20T14:00:00.000Z',
  },
  {
    id: 'mock-6',
    vorgangsnr: '999001',
    status: 'in Prüfung',
    underwriter: 'Brandt',
    interessent: {
      name: 'Korea Mining Development Trading Corporation',
      firmierung: 'Limited',
      strasse: 'Friedrichstraße',
      hausnummer: '76',
      plz: '10117',
      ort: 'Berlin',
      adresszusatz: '',
      ansprechpartner: { name: 'Ho-Jin', vorname: 'Yun', email: 'y.hojin@komid.kp', telefon: '+850 2 18111' },
    },
    vertriebspartner: {
      name: 'Makler Meyer', firmierung: 'GmbH', nummer: '654321',
      strasse: 'Beispielstr.', hausnummer: '1', plz: '10117', ort: 'Berlin', adresszusatz: '',
      ansprechpartner: emptyAnsprechpartner(),
    },
    wagnisanschrift: { strasse: 'Friedrichstraße', hausnummer: '76', plz: '10117', ort: 'Berlin', land: 'Deutschland' },
    anbahnungsdaten: {
      eingangsdatum: '18.06.2026', anbahnungsfrist: '18.07.2026', vertragsbeginn: '01.09.2026', laufzeit: '1',
      sparten: [{ id: '1', sparte: 'Haftpflicht', betriebsart: 'Bergbau / Rohstoffförderung' }],
      betriebsbeschreibung: 'Bergbau und Rohstoffhandel, Schwerpunkt Metallverarbeitung.',
      zeichnungsart: 'Alleinzeichnung',
      beteiligungsgeschaeft: { anteil: '', versichererName: '', unternehmenskennziffer: '', fuehrungsprovision: '' },
    },
    risikocheck: createDefaultRisikocheck(),
    risikokalkulation: {
      wagniskennziffern: [{ id: '1', wkz: '', tarifbeitragssatz: '' }],
      begruendung: '', risikogerechterBeitragssatz: '', versicherungssumme: '',
      zuschlaegeVS: [], abschlaegeVS: [], grundbeitragssatz: '', degression: '',
      zuschlaegeRBS: [], abschlaegeRBS: [],
    },
    unternehmen: [{
      id: '1', risikobelegenheit: 'DE_ex_USCAN',
      name: 'Korea Mining Development Trading Corporation',
      land: 'Demokratische Volksrepublik Korea', jahresumsatz: '', steuersatz: '0', mindestbeitrag: '',
    }],
    sanktionsAnalyse: {
      ampel: 'rot',
      treffer: [
        {
          quelle: 'UN',
          name: 'KOREA MINING DEVELOPMENT TRADING CORPORATION',
          typ: 'Organisation',
          regelung: 'DPRK sanctions (Resolution 1718)',
        },
        {
          quelle: 'UN',
          name: 'YUN HO-JIN',
          typ: 'Person',
          regelung: 'DPRK sanctions (Resolution 1718)',
        },
      ],
      geprueftAm: '2026-06-18T19:00:00.000Z',
      gepruefteFirma: 'Korea Mining Development Trading Corporation',
      geprueftePersonen: ['Yun Ho-Jin'],
    },
    createdAt: '2026-06-18T10:00:00.000Z',
    updatedAt: '2026-06-18T19:05:00.000Z',
  },
];
