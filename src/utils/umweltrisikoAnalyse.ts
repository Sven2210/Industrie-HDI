import type { RisikoAmpel, UmweltrisikoAnalyse, UmweltrisikoKategorie } from '../types/antrag';

type KategorieSchluessel = 'luftemissionen' | 'gewaesserBoden' | 'abfall' | 'laerm' | 'brandExplosion';

interface BranchenProfil {
  keywords: string[];
  bewertungen: Partial<Record<KategorieSchluessel, { ampel: RisikoAmpel; begruendung: string }>>;
}

// ── Branchen-Wissensbasis ───────────────────────────────────────────────────────
// Feste, regelbasierte Zuordnung Branche → Umweltrisikoprofil (keine KI, keine externe API).

const BRANCHEN_PROFILE: BranchenProfil[] = [
  {
    keywords: ['chemie', 'chemisch', 'petrochemie', 'raffinerie'],
    bewertungen: {
      luftemissionen: { ampel: 'rot', begruendung: 'Chemische Prozesse verursachen typischerweise erhebliche Luftschadstoffemissionen (VOC, Säuren, Lösemitteldämpfe).' },
      gewaesserBoden: { ampel: 'rot', begruendung: 'Hohes Risiko für Gewässer- und Bodenkontamination durch Prozesschemikalien und Abwässer.' },
      abfall: { ampel: 'rot', begruendung: 'Anfall von Sonderabfällen und gefährlichen Reststoffen ist branchentypisch hoch.' },
      laerm: { ampel: 'gelb', begruendung: 'Anlagenbetrieb (Pumpen, Kompressoren) verursacht erhöhte Lärmemissionen.' },
      brandExplosion: { ampel: 'rot', begruendung: 'Umgang mit brennbaren/reaktiven Stoffen birgt erhöhtes Brand- und Explosionsrisiko.' },
    },
  },
  {
    keywords: ['textil'],
    bewertungen: {
      luftemissionen: { ampel: 'gelb', begruendung: 'Textilveredelung kann Lösemittel- und Staubemissionen verursachen.' },
      gewaesserBoden: { ampel: 'gelb', begruendung: 'Färbe- und Waschprozesse führen zu belastetem Abwasser (Farbstoffe, Chemikalien).' },
      abfall: { ampel: 'gelb', begruendung: 'Produktionsabfälle (Garn-/Stoffreste, Chemikalienreste) in relevantem Umfang.' },
      laerm: { ampel: 'gelb', begruendung: 'Webmaschinen und Produktionsanlagen erzeugen erhöhten Lärmpegel.' },
      brandExplosion: { ampel: 'gelb', begruendung: 'Textilstäube und Lösemittel erhöhen das Brandrisiko moderat.' },
    },
  },
  {
    keywords: ['metall', 'stahl', 'galvanik', 'verzinkung', 'beize', 'oberflächenbehandlung'],
    bewertungen: {
      luftemissionen: { ampel: 'gelb', begruendung: 'Schmelz- und Beizprozesse verursachen Staub- und Säuredampfemissionen.' },
      gewaesserBoden: { ampel: 'rot', begruendung: 'Galvanik-/Beizbäder enthalten Schwermetalle mit hohem Kontaminationsrisiko bei Leckagen.' },
      abfall: { ampel: 'gelb', begruendung: 'Metallschlämme und verbrauchte Prozessbäder sind gefährliche Abfälle.' },
      laerm: { ampel: 'rot', begruendung: 'Umform- und Schmiedeprozesse verursachen hohe Lärmpegel.' },
      brandExplosion: { ampel: 'gelb', begruendung: 'Heißarbeiten und brennbare Metallstäube bergen Brandrisiko.' },
    },
  },
  {
    keywords: ['bergbau', 'rohstoff', 'abbau', 'förderung'],
    bewertungen: {
      luftemissionen: { ampel: 'rot', begruendung: 'Abbau und Aufbereitung verursachen erhebliche Staub- und Emissionsbelastung.' },
      gewaesserBoden: { ampel: 'rot', begruendung: 'Hohes Risiko für Bodenerosion und Grundwasserkontamination durch Abraum und Prozesswässer.' },
      abfall: { ampel: 'rot', begruendung: 'Großes Aufkommen an Abraum- und Bergbaurückständen, teils gefährlich.' },
      laerm: { ampel: 'rot', begruendung: 'Abbau- und Fördertechnik verursacht dauerhaft hohe Lärmpegel.' },
      brandExplosion: { ampel: 'gelb', begruendung: 'Sprengarbeiten und Maschineneinsatz bergen erhöhtes Risiko.' },
    },
  },
  {
    keywords: ['lebensmittel', 'nahrungsmittel', 'brauerei', 'molkerei'],
    bewertungen: {
      luftemissionen: { ampel: 'gruen', begruendung: 'Geringe Luftschadstoffemissionen, ggf. Gerüche.' },
      gewaesserBoden: { ampel: 'gelb', begruendung: 'Abwässer mit hoher organischer Fracht (CSB/BSB) belasten Gewässer, wenn unbehandelt.' },
      abfall: { ampel: 'gelb', begruendung: 'Organische Reststoffe und Verpackungsabfälle in relevantem Umfang.' },
      laerm: { ampel: 'gelb', begruendung: 'Produktions- und Kühlanlagen verursachen moderaten Lärmpegel.' },
      brandExplosion: { ampel: 'gruen', begruendung: 'Geringes Brand-/Explosionsrisiko, außer bei Mehlstaub oder Kühlmitteln.' },
    },
  },
  {
    keywords: ['kunststoff', 'plastik'],
    bewertungen: {
      luftemissionen: { ampel: 'gelb', begruendung: 'Verarbeitung (Extrusion, Spritzguss) verursacht Kunststoffdämpfe und Gerüche.' },
      gewaesserBoden: { ampel: 'gelb', begruendung: 'Additive und Weichmacher können bei Freisetzung Gewässer/Boden belasten.' },
      abfall: { ampel: 'rot', begruendung: 'Hohes Aufkommen an Kunststoffabfällen und Mikroplastik.' },
      laerm: { ampel: 'gelb', begruendung: 'Extruder und Spritzgussmaschinen erzeugen erhöhten Lärmpegel.' },
      brandExplosion: { ampel: 'rot', begruendung: 'Kunststoffe und Kunststoffstäube sind leicht entzündlich.' },
    },
  },
  {
    keywords: ['holz', 'sägewerk', 'möbel'],
    bewertungen: {
      luftemissionen: { ampel: 'gelb', begruendung: 'Holzbearbeitung verursacht Staub- und Lösemittelemissionen (Lackierung).' },
      gewaesserBoden: { ampel: 'gruen', begruendung: 'Geringes Kontaminationsrisiko für Gewässer und Boden.' },
      abfall: { ampel: 'gelb', begruendung: 'Sägemehl, Späne und Verschnitt in großem Umfang, meist aber verwertbar.' },
      laerm: { ampel: 'gelb', begruendung: 'Sägen und Fräsen verursachen erhöhten Lärmpegel.' },
      brandExplosion: { ampel: 'rot', begruendung: 'Holzstaub birgt ein hohes Staubexplosions- und Brandrisiko.' },
    },
  },
  {
    keywords: ['papier', 'zellstoff', 'druckerei', 'druck'],
    bewertungen: {
      luftemissionen: { ampel: 'gelb', begruendung: 'Druckprozesse verursachen Lösemittel-/VOC-Emissionen.' },
      gewaesserBoden: { ampel: 'gelb', begruendung: 'Prozesswässer und Druckchemikalien können Gewässer belasten.' },
      abfall: { ampel: 'gelb', begruendung: 'Papier-, Farb- und Lösemittelreste als relevanter Abfallstrom.' },
      laerm: { ampel: 'gruen', begruendung: 'Geringe bis moderate Lärmemissionen.' },
      brandExplosion: { ampel: 'gelb', begruendung: 'Lösemittel und Papierstaub erhöhen das Brandrisiko moderat.' },
    },
  },
  {
    keywords: ['energie', 'kraftwerk', 'stromerzeugung'],
    bewertungen: {
      luftemissionen: { ampel: 'rot', begruendung: 'Energieerzeugung verursacht signifikante Emissionen (CO2, NOx, ggf. Feinstaub).' },
      gewaesserBoden: { ampel: 'gelb', begruendung: 'Kühlwasser und Betriebsstoffe bergen ein moderates Kontaminationsrisiko.' },
      abfall: { ampel: 'gelb', begruendung: 'Rückstände wie Asche oder Filterstäube in relevantem Umfang.' },
      laerm: { ampel: 'gelb', begruendung: 'Turbinen und Generatoren erzeugen erhöhten Lärmpegel.' },
      brandExplosion: { ampel: 'gelb', begruendung: 'Brennstofflagerung und -umschlag bergen ein moderates Risiko.' },
    },
  },
  {
    keywords: ['bau', 'hochbau', 'tiefbau', 'baustoffe'],
    bewertungen: {
      luftemissionen: { ampel: 'gelb', begruendung: 'Bautätigkeit verursacht Staubemissionen und Maschinenabgase.' },
      gewaesserBoden: { ampel: 'gelb', begruendung: 'Baustellenabwässer und Betriebsstoffe bergen ein moderates Risiko.' },
      abfall: { ampel: 'gelb', begruendung: 'Bauschutt und Verpackungsabfälle in großem Umfang.' },
      laerm: { ampel: 'rot', begruendung: 'Baumaschinen verursachen hohe Lärmemissionen.' },
      brandExplosion: { ampel: 'gruen', begruendung: 'Geringes Brand-/Explosionsrisiko im regulären Baubetrieb.' },
    },
  },
  {
    keywords: ['transport', 'logistik', 'luftfracht', 'spedition', 'fuhrpark'],
    bewertungen: {
      luftemissionen: { ampel: 'gelb', begruendung: 'Fahrzeug- und Flottenbetrieb verursacht Abgasemissionen.' },
      gewaesserBoden: { ampel: 'gruen', begruendung: 'Geringes Kontaminationsrisiko außer bei Kraftstoff-/Öllagerung.' },
      abfall: { ampel: 'gruen', begruendung: 'Geringes Abfallaufkommen aus dem eigentlichen Transportbetrieb.' },
      laerm: { ampel: 'gelb', begruendung: 'Umschlag- und Fahrzeugbetrieb verursacht erhöhten Lärmpegel.' },
      brandExplosion: { ampel: 'gelb', begruendung: 'Kraftstofflagerung birgt ein moderates Brandrisiko.' },
    },
  },
  {
    keywords: ['elektronik', 'elektro', 'halbleiter'],
    bewertungen: {
      luftemissionen: { ampel: 'gelb', begruendung: 'Lötprozesse und Reinigungsmittel verursachen moderate Emissionen.' },
      gewaesserBoden: { ampel: 'gelb', begruendung: 'Lösemittel und Schwermetalle bergen ein moderates Kontaminationsrisiko.' },
      abfall: { ampel: 'rot', begruendung: 'Elektroschrott und Sondermüll (Platinen, Batterien) in relevantem Umfang.' },
      laerm: { ampel: 'gruen', begruendung: 'Geringe Lärmemissionen in der Elektronikfertigung.' },
      brandExplosion: { ampel: 'gelb', begruendung: 'Batterien und Lösemittel bergen ein moderates Brandrisiko.' },
    },
  },
  {
    keywords: ['pharma', 'arzneimittel', 'biotech'],
    bewertungen: {
      luftemissionen: { ampel: 'gelb', begruendung: 'Produktionsprozesse verursachen moderate Lösemittel-/Staubemissionen.' },
      gewaesserBoden: { ampel: 'rot', begruendung: 'Wirkstoffrückstände im Abwasser bergen ein hohes Kontaminationsrisiko für Gewässer.' },
      abfall: { ampel: 'rot', begruendung: 'Hohes Aufkommen an Sonderabfällen (Wirkstoffreste, kontaminierte Materialien).' },
      laerm: { ampel: 'gruen', begruendung: 'Geringe Lärmemissionen in der Pharmaproduktion.' },
      brandExplosion: { ampel: 'gelb', begruendung: 'Lösemittel im Produktionsprozess bergen ein moderates Risiko.' },
    },
  },
  {
    keywords: ['landwirtschaft', 'agrar', 'tierhaltung', 'futtermittel'],
    bewertungen: {
      luftemissionen: { ampel: 'gelb', begruendung: 'Tierhaltung und Düngung verursachen Ammoniak- und Geruchsemissionen.' },
      gewaesserBoden: { ampel: 'rot', begruendung: 'Gülle und Düngemittel bergen ein hohes Risiko für Boden- und Gewässerbelastung (Nitrateintrag).' },
      abfall: { ampel: 'gruen', begruendung: 'Geringes Sonderabfallaufkommen, überwiegend organische Reststoffe.' },
      laerm: { ampel: 'gruen', begruendung: 'Geringe bis moderate Lärmemissionen.' },
      brandExplosion: { ampel: 'gelb', begruendung: 'Futtermittellagerung (Staub, Heu) birgt ein moderates Brandrisiko.' },
    },
  },
  {
    keywords: ['gummi', 'reifen', 'kautschuk'],
    bewertungen: {
      luftemissionen: { ampel: 'gelb', begruendung: 'Vulkanisation verursacht charakteristische Geruchs- und Schadstoffemissionen.' },
      gewaesserBoden: { ampel: 'gelb', begruendung: 'Prozesschemikalien bergen ein moderates Kontaminationsrisiko.' },
      abfall: { ampel: 'gelb', begruendung: 'Gummiabfälle und Altreifen in relevantem Umfang.' },
      laerm: { ampel: 'gelb', begruendung: 'Produktionsanlagen verursachen erhöhten Lärmpegel.' },
      brandExplosion: { ampel: 'rot', begruendung: 'Kautschuk und Gummi sind gut brennbar, Lagerbrände sind branchentypisch.' },
    },
  },
  {
    keywords: ['glas', 'keramik', 'zement', 'beton', 'baustoffindustrie'],
    bewertungen: {
      luftemissionen: { ampel: 'rot', begruendung: 'Brenn- und Schmelzprozesse verursachen erhebliche Staub- und CO2-Emissionen.' },
      gewaesserBoden: { ampel: 'gruen', begruendung: 'Geringes Kontaminationsrisiko für Gewässer und Boden.' },
      abfall: { ampel: 'gelb', begruendung: 'Produktionsausschuss und Verpackungsreste in relevantem Umfang.' },
      laerm: { ampel: 'gelb', begruendung: 'Mahl- und Brennanlagen verursachen erhöhten Lärmpegel.' },
      brandExplosion: { ampel: 'gruen', begruendung: 'Geringes Brand-/Explosionsrisiko im regulären Betrieb.' },
    },
  },
  {
    keywords: ['kfz', 'autoteile', 'automobil', 'fahrzeugbau', 'lackierung'],
    bewertungen: {
      luftemissionen: { ampel: 'gelb', begruendung: 'Lackierprozesse verursachen Lösemittel- und VOC-Emissionen.' },
      gewaesserBoden: { ampel: 'gelb', begruendung: 'Öle, Lacke und Reinigungsmittel bergen ein moderates Kontaminationsrisiko.' },
      abfall: { ampel: 'gelb', begruendung: 'Altöle, Lackschlämme und Metallreste in relevantem Umfang.' },
      laerm: { ampel: 'gelb', begruendung: 'Fertigungsanlagen verursachen erhöhten Lärmpegel.' },
      brandExplosion: { ampel: 'gelb', begruendung: 'Lösemittel und Lacke bergen ein moderates Brandrisiko.' },
    },
  },
];

const KATEGORIE_SCHLUESSEL: KategorieSchluessel[] = ['luftemissionen', 'gewaesserBoden', 'abfall', 'laerm', 'brandExplosion'];

const AMPEL_RANG: Record<RisikoAmpel, number> = { gruen: 0, gelb: 1, rot: 2, unbekannt: -1 };

function schlechtereAmpel(a: RisikoAmpel, b: RisikoAmpel): RisikoAmpel {
  return AMPEL_RANG[b] > AMPEL_RANG[a] ? b : a;
}

function normalisiere(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function analysiereUmweltrisiko(betriebsarten: string[], betriebsbeschreibung: string): UmweltrisikoAnalyse {
  const suchtext = normalisiere([...betriebsarten, betriebsbeschreibung].join(' '));
  const treffer = BRANCHEN_PROFILE.filter((p) => p.keywords.some((k) => suchtext.includes(k)));

  const kategorien: Record<KategorieSchluessel, UmweltrisikoKategorie> = {} as Record<KategorieSchluessel, UmweltrisikoKategorie>;

  for (const key of KATEGORIE_SCHLUESSEL) {
    const bewertungen = treffer.map((p) => p.bewertungen[key]).filter(Boolean) as { ampel: RisikoAmpel; begruendung: string }[];
    if (bewertungen.length === 0) {
      kategorien[key] = {
        ampel: 'unbekannt',
        begruendung: 'Branche konnte anhand der Betriebsart nicht automatisch zugeordnet werden — bitte manuell einschätzen.',
      };
      continue;
    }
    const schlechteste = bewertungen.reduce((acc, b) => schlechtereAmpel(acc, b.ampel), 'gruen' as RisikoAmpel);
    const begruendungen = bewertungen.filter((b) => b.ampel === schlechteste).map((b) => b.begruendung);
    kategorien[key] = { ampel: schlechteste, begruendung: [...new Set(begruendungen)].join(' ') };
  }

  const gesamtAmpel = KATEGORIE_SCHLUESSEL
    .map((k) => kategorien[k].ampel)
    .reduce((acc, a) => (a === 'unbekannt' ? acc : schlechtereAmpel(acc, a)), 'gruen' as RisikoAmpel);

  return {
    ampel: gesamtAmpel,
    branchenerkannt: treffer.length > 0,
    luftemissionen: kategorien.luftemissionen,
    gewaesserBoden: kategorien.gewaesserBoden,
    abfall: kategorien.abfall,
    laerm: kategorien.laerm,
    brandExplosion: kategorien.brandExplosion,
    analysiertAm: new Date().toISOString(),
  };
}

// ── Regelbasierte Einschätzung ──────────────────────────────────────────────────

const KATEGORIE_LABELS: Record<KategorieSchluessel, string> = {
  luftemissionen: 'Luftemissionen',
  gewaesserBoden: 'Gewässer- und Bodenkontamination',
  abfall: 'Abfall- und Sondermüllaufkommen',
  laerm: 'Lärmemissionen',
  brandExplosion: 'Brand- und Explosionsrisiko',
};

export function formuliereUmweltrisikoEinschaetzung(analyse: UmweltrisikoAnalyse): string {
  if (!analyse.branchenerkannt) {
    return 'Die angegebene Betriebsart konnte keiner hinterlegten Branche zugeordnet werden. Eine automatische Einschätzung der Umweltauswirkungen ist daher nicht möglich — bitte die Umweltrisiken manuell anhand der Betriebsbeschreibung einschätzen.';
  }

  const kategorien = KATEGORIE_SCHLUESSEL.map((k) => [k, analyse[k]] as [KategorieSchluessel, UmweltrisikoKategorie]);
  const rot = kategorien.filter(([, k]) => k.ampel === 'rot').map(([k]) => KATEGORIE_LABELS[k]);
  const gelb = kategorien.filter(([, k]) => k.ampel === 'gelb').map(([k]) => KATEGORIE_LABELS[k]);

  if (analyse.ampel === 'gruen') {
    return 'Die Geschäftstätigkeit weist insgesamt ein geringes Umweltrisiko auf. In keiner der geprüften Kategorien (Luftemissionen, Gewässer-/Bodenkontamination, Abfall, Lärm, Brand-/Explosionsrisiko) besteht eine erhöhte Belastung. Aus Umwelthaftungssicht bestehen keine Bedenken gegen eine reguläre Zeichnung.';
  }
  if (analyse.ampel === 'gelb') {
    return `Die Geschäftstätigkeit weist ein mittleres Umweltrisiko auf. Erhöhte Belastung besteht bei: ${gelb.join(', ')}. Empfehlung: Umwelthaftungsdeckung und Selbstbehalte auf die genannten Risiken abstimmen, ggf. Nachweise zu Genehmigungen und Auflagen einholen.`;
  }
  if (analyse.ampel === 'rot') {
    const zusatz = gelb.length > 0 ? ` Erhöht ist zudem: ${gelb.join(', ')}.` : '';
    return `Die Geschäftstätigkeit weist ein hohes Umweltrisiko auf. Kritisch bewertet sind: ${rot.join(', ')}.${zusatz} Empfehlung: Vor Zeichnung eine vertiefte Umwelthaftungsprüfung durchführen (Genehmigungslage, Auflagen, Vorschäden), Deckungssummen und Selbstbehalte entsprechend anpassen und ggf. spezielle Umwelthaftpflichtklauseln vereinbaren.`;
  }
  return 'Eine automatische Gesamteinschätzung war nicht möglich — bitte die Einzelbewertungen manuell prüfen.';
}
