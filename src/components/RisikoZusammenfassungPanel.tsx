import React, { useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Typography } from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import type { AntragData, RisikoAmpel, RisikoZusammenfassung } from '../types/antrag';
import {
  baueZusammenfassungEingabe, eingabeStand, erzeugeRisikoZusammenfassung, hatAnalyseErgebnisse,
} from '../utils/risikoZusammenfassung';

interface Props {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
}

const AMPEL: Record<RisikoAmpel, { farbe: string; bg: string; label: string }> = {
  gruen: { farbe: '#15803D', bg: '#F0FDF4', label: 'Grün' },
  gelb: { farbe: '#B45309', bg: '#FFFBEB', label: 'Gelb' },
  rot: { farbe: '#DC2626', bg: '#FEF2F2', label: 'Rot' },
  unbekannt: { farbe: '#64748B', bg: '#F8FAFC', label: 'Unklar' },
};

function alsText(z: RisikoZusammenfassung): string {
  return [
    z.kurzfazit,
    ...(z.stichpunkte.length ? ['', ...z.stichpunkte.map((s) => `• ${s.titel ? `${s.titel}: ` : ''}${s.text}`)] : []),
    ...(z.offenePunkte.length ? ['', 'Offene Punkte:', ...z.offenePunkte.map((p) => `• ${p}`)] : []),
  ].join('\n');
}

// KI-Zusammenfassung der Analyseergebnisse (adesso AI Hub, serverseitig). Entsteht nur auf Klick
// und ist ein Vorschlag: sie ersetzt weder die Ampeln noch die manuelle Einschätzung.
const RisikoZusammenfassungPanel: React.FC<Props> = ({ data, onChange }) => {
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState(false);

  const eingabe = baueZusammenfassungEingabe(data);
  const moeglich = hatAnalyseErgebnisse(eingabe);
  const z = data.risikoZusammenfassung;
  const veraltet = z ? z.eingabeStand !== eingabeStand(eingabe) : false;

  const erstellen = async () => {
    setLaedt(true);
    setFehler(null);
    try {
      onChange({ risikoZusammenfassung: await erzeugeRisikoZusammenfassung(eingabe) });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Die Zusammenfassung konnte nicht erstellt werden.');
    } finally {
      setLaedt(false);
    }
  };

  const kopieren = async () => {
    if (!z) return;
    try {
      await navigator.clipboard.writeText(alsText(z));
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch {
      setFehler('Kopieren nicht möglich — bitte Text markieren und manuell kopieren.');
    }
  };

  return (
    <Box sx={{ mt: 3, p: 3, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>Risikozusammenfassung (KI)</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: '#64748B' }}>
            Fasst die Ergebnisse der Analysen zusammen. Es werden keine Kundendaten (Name, Anschrift) übermittelt.
          </Typography>
        </Box>
        <Button
          size="small" variant="outlined" onClick={erstellen} disabled={laedt || !moeglich}
          startIcon={laedt ? <CircularProgress size={14} /> : <AutoAwesomeOutlinedIcon />}
        >
          {laedt ? 'Wird erstellt …' : z ? 'Neu erstellen' : 'Zusammenfassung erstellen'}
        </Button>
      </Box>

      {!moeglich && !z && (
        <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8', mt: 1 }}>
          Verfügbar, sobald Analyseergebnisse vorliegen (Dokument auswerten, Standort- oder Sanktionsprüfung).
        </Typography>
      )}

      {fehler && <Alert severity="error" sx={{ mt: 2, fontSize: '0.8rem' }}>{fehler}</Alert>}

      {z && (
        <Box sx={{ mt: 2 }}>
          {veraltet && (
            <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem' }}>
              Die Analysen haben sich seit der Erstellung geändert — bitte neu erstellen.
            </Alert>
          )}
          <Typography sx={{ fontSize: '0.85rem', color: '#0F172A', lineHeight: 1.6 }}>{z.kurzfazit}</Typography>

          {z.stichpunkte.length > 0 && (
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 1.5, display: 'grid', gap: 1 }}>
              {z.stichpunkte.map((s, i) => (
                <Box component="li" key={i} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <Chip
                    label={AMPEL[s.ampel]?.label ?? AMPEL.unbekannt.label} size="small"
                    sx={{ bgcolor: (AMPEL[s.ampel] ?? AMPEL.unbekannt).bg, color: (AMPEL[s.ampel] ?? AMPEL.unbekannt).farbe, fontWeight: 700, fontSize: '0.68rem', minWidth: 56 }}
                  />
                  <Typography sx={{ fontSize: '0.82rem', color: '#334155' }}>
                    {s.titel && <strong>{s.titel}: </strong>}{s.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {z.offenePunkte.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                Offene Punkte
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {z.offenePunkte.map((p, i) => (
                  <Typography component="li" key={i} sx={{ fontSize: '0.82rem', color: '#334155' }}>{p}</Typography>
                ))}
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
              KI-Vorschlag, bitte prüfen · {new Date(z.erstelltAm).toLocaleString('de-DE')}{z.modell ? ` · ${z.modell}` : ''}
            </Typography>
            <Button size="small" startIcon={<ContentCopyOutlinedIcon />} onClick={kopieren}>
              {kopiert ? 'Kopiert' : 'Kopieren'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default RisikoZusammenfassungPanel;
