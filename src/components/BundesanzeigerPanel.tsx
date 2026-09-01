import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import type { AntragData, RisikoAmpel, InsolvenzEintrag } from '../types/antrag';
import { pruefeBundesanzeiger } from '../utils/bundesanzeigerAnalyse';

const AMPEL_CONFIG: Record<RisikoAmpel, { color: string; bg: string; border: string; label: string }> = {
  gruen: { color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', label: 'Keine Auffälligkeiten' },
  gelb: { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', label: 'Auffälligkeiten vorhanden' },
  rot: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Insolvenzeinträge vorhanden' },
  unbekannt: { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', label: 'Prüfung nicht verfügbar' },
};

const JA_CONFIG = {
  aktuell: { color: '#15803D', label: 'Aktuell' },
  fehlt: { color: '#B45309', label: 'Nicht aktuell' },
  unbekannt: { color: '#94A3B8', label: 'Nicht prüfbar' },
};

interface Props {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
}

const BundesanzeigerPanel: React.FC<Props> = ({ data, onChange }) => {
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const lastKeyRef = useRef<string>('');

  const firmaName = data.interessent.name.trim();
  const analyse = data.bundesanzeigerAnalyse;
  const istBereit = firmaName.length >= 3;

  useEffect(() => {
    if (!istBereit) return;
    if (firmaName === lastKeyRef.current) return;

    setLoading(true);
    setFehler(null);
    let aborted = false;

    const debounce = setTimeout(() => {
      lastKeyRef.current = firmaName;

      pruefeBundesanzeiger(firmaName)
        .then((result) => { if (!aborted) onChange({ bundesanzeigerAnalyse: result }); })
        .catch((e: Error) => {
          if (!aborted) {
            lastKeyRef.current = '';
            setFehler(e.message ?? 'Prüfung fehlgeschlagen');
          }
        })
        .finally(() => { if (!aborted) setLoading(false); });
    }, 800);

    return () => {
      clearTimeout(debounce);
      aborted = true;
    };
  }, [firmaName]);

  if (!istBereit) {
    return (
      <Box sx={{ p: 3, bgcolor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 2, textAlign: 'center' }}>
        <Typography sx={{ color: '#94A3B8', fontSize: '0.85rem' }}>
          Bitte Firmenname auf Reiter 1 eintragen, um die Bundesanzeiger-Prüfung zu starten.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2 }}>
        <CircularProgress size={20} />
        <Typography sx={{ color: '#64748B', fontSize: '0.85rem' }}>
          Insolvenzbekanntmachungen und Bundesanzeiger werden abgefragt …
        </Typography>
      </Box>
    );
  }

  if (fehler && !analyse) {
    return (
      <Box sx={{ p: 2, bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 2 }}>
        <Typography sx={{ color: '#DC2626', fontSize: '0.85rem' }}>Fehler: {fehler}</Typography>
      </Box>
    );
  }

  if (!analyse) return null;

  const c = AMPEL_CONFIG[analyse.ampel];
  const ja = JA_CONFIG[analyse.jahresabschlussStatus];
  const jaLabel = analyse.letzterJahresabschluss
    ? `${ja.label} (${analyse.letzterJahresabschluss})`
    : ja.label;

  // Wenn beide Quellen nicht verfügbar: informativen Hinweis zeigen statt leerer Karte
  const nurFehler = analyse.insolvenzeintraege.length === 0 && analyse.ampel === 'unbekannt';

  return (
    <Box>
      {/* Gesamtstatus */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 2, mb: 2 }}>
        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Bundesanzeiger-Prüfung
          </Typography>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: c.color }}>{c.label}</Typography>
        </Box>
        <Box sx={{ fontSize: '0.72rem', color: '#94A3B8', textAlign: 'right' }}>
          <div>Geprüft: {new Date(analyse.geprueftAm).toLocaleDateString('de-DE')}</div>
          <div>Firma: {analyse.gepruefteFirma}</div>
        </Box>
      </Box>

      {/* Hinweis wenn kein Datenzugang */}
      {nurFehler && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', mb: 0.5 }}>
            Automatische Abfrage nicht möglich
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>
            Insolvenzbekanntmachungen.de verwendet seit 2024 eine sessionbasierte JSF-Architektur.
            Bundesanzeiger-Daten erfordern einen authentifizierten API-Zugang. Für den Produktionseinsatz
            empfehlen wir die Integration einer Compliance-API (z.B. Creditreform, SCHUFA-Firmendaten
            oder das Unternehmensregister XBRL-API des Bundesjustizamts).
          </Typography>
        </Box>
      )}

      {/* Kennzahlen-Grid */}
      {!nurFehler && <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
        <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
            Insolvenzeinträge
          </Typography>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: analyse.insolvenzeintraege.length > 0 ? '#DC2626' : '#15803D', lineHeight: 1 }}>
            {analyse.insolvenzeintraege.length}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: '#64748B', mt: 0.25 }}>letzte 5 Jahre</Typography>
        </Box>
        <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
            Jahresabschluss
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: ja.color, lineHeight: 1.2 }}>
            {jaLabel}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: '#64748B', mt: 0.25 }}>Bundesanzeiger</Typography>
        </Box>
      </Box>}

      {/* Insolvenzeinträge Details */}
      {!nurFehler && analyse.insolvenzeintraege.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
            Insolvenzbekanntmachungen ({analyse.insolvenzeintraege.length})
          </Typography>
          {analyse.insolvenzeintraege.map((entry: InsolvenzEintrag, i: number) => (
            <Box key={i} sx={{ mb: 1, p: 2, bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#DC2626' }}>{entry.art}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>{entry.bekanntmachungsdatum}</Typography>
              </Box>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>
                Az.: {entry.aktenzeichen}{entry.gericht ? ` — ${entry.gericht}` : ''}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Teilfehler-Hinweis (nur bei partiellen Fehlern, nicht wenn beides nicht verfügbar) */}
      {analyse.fehler && !nurFehler && (
        <Box sx={{ p: 1.5, bgcolor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 2, fontSize: '0.75rem', color: '#B45309' }}>
          <strong>Hinweis:</strong> {analyse.fehler}
        </Box>
      )}
    </Box>
  );
};

export default BundesanzeigerPanel;
