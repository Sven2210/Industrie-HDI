import React, { useState } from 'react';
import { Alert, Button, Typography } from '@mui/material';
import type { AntragData } from '../types/antrag';
import { leseFragebogenKombiniert } from '../utils/fragebogenKi';
import { UEBERNOMMEN_FARBE, wendeKombiniertAn } from '../utils/fragebogenUebernahme';

interface Props {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
}

// Hinweis auf Reiter 1: was aus dem Fragebogen übernommen wurde bzw. nicht gefunden wurde, plus
// die Möglichkeit, den Fragebogen erneut einzulesen (füllt nur noch leere Felder).
const FragebogenHinweis: React.FC<Props> = ({ data, onChange }) => {
  const [laedt, setLaedt] = useState(false);
  const [rueckmeldung, setRueckmeldung] = useState<string | null>(null);

  const uebernahme = data.fragebogenUebernahme;
  const dokument = [...(data.analyse?.dokumente ?? [])].reverse().find((d) => d.typ === 'application/pdf');
  if (!uebernahme && !dokument) return null;

  const anzahl = uebernahme ? Object.keys(uebernahme.werte).length : 0;
  // Nur Pfade zählen, die noch unverändert aus der KI stammen
  const anzahlKi = uebernahme ? (uebernahme.kiPfade ?? []).filter((p) => p in uebernahme.werte).length : 0;

  const handleNeuEinlesen = async () => {
    if (!dokument) return;
    setLaedt(true);
    setRueckmeldung(null);
    try {
      const kombi = await leseFragebogenKombiniert(dokument, data.kiAuslese);
      const neu = wendeKombiniertAn(data, kombi, dokument.dateiname);
      const dazu = Object.keys(neu.fragebogenUebernahme?.werte ?? {}).length - anzahl;
      onChange({
        interessent: neu.interessent,
        wagnisanschrift: neu.wagnisanschrift,
        anbahnungsdaten: neu.anbahnungsdaten,
        risikocheck: neu.risikocheck,
        risikokalkulation: neu.risikokalkulation,
        unternehmen: neu.unternehmen,
        fragebogenUebernahme: neu.fragebogenUebernahme,
        kiAuslese: neu.kiAuslese,
      });
      setRueckmeldung(dazu > 0 ? `${dazu} weitere Felder übernommen.` : 'Keine weiteren leeren Felder gefunden.');
    } catch (err) {
      console.error('[FragebogenHinweis] Erneutes Einlesen fehlgeschlagen', err);
      setRueckmeldung('Der Fragebogen konnte nicht gelesen werden.');
    } finally {
      setLaedt(false);
    }
  };

  return (
    <Alert
      severity={uebernahme?.hinweis || uebernahme?.kiHinweis ? 'warning' : 'info'}
      sx={{
        mb: 3,
        alignItems: 'center',
        // Normalfall in der Markierungsfarbe des jeweiligen Brandings, Warnung bleibt gelb
        ...(uebernahme?.hinweis || uebernahme?.kiHinweis ? {} : { bgcolor: UEBERNOMMEN_FARBE, color: '#0F172A', '& .MuiAlert-icon': { color: 'primary.main' } }),
      }}
      action={
        dokument ? (
          <Button size="small" color="inherit" onClick={handleNeuEinlesen} disabled={laedt} sx={{ whiteSpace: 'nowrap' }}>
            {laedt ? 'Liest …' : 'Fragebogen erneut einlesen'}
          </Button>
        ) : undefined
      }
    >
      {uebernahme ? (
        <>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {anzahl} {anzahl === 1 ? 'Feld' : 'Felder'} aus dem Fragebogen „{uebernahme.dokumentName}" übernommen
            {anzahlKi > 0 && ` — davon ${anzahlKi} per KI gelesen (gelb markiert, bitte prüfen)`}
          </Typography>
          <Typography sx={{ fontSize: '0.78rem' }}>
            Übernommene Felder sind hinterlegt, solange sie unverändert sind. Bereits Erfasstes wird nie überschrieben.
            {uebernahme.nichtGefunden.length > 0 && ` Nicht gefunden: ${uebernahme.nichtGefunden.join(', ')}.`}
          </Typography>
          {uebernahme.hinweis && <Typography sx={{ fontSize: '0.78rem' }}>{uebernahme.hinweis}</Typography>}
          {uebernahme.kiHinweis && <Typography sx={{ fontSize: '0.78rem' }}>{uebernahme.kiHinweis}</Typography>}
        </>
      ) : (
        <Typography sx={{ fontSize: '0.85rem' }}>
          Ein Fragebogen ist hochgeladen — Angaben daraus können in leere Felder übernommen werden.
        </Typography>
      )}
      {rueckmeldung && <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, mt: 0.5 }}>{rueckmeldung}</Typography>}
    </Alert>
  );
};

export default FragebogenHinweis;
