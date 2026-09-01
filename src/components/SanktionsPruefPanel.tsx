import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Chip } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import type { AntragData, RisikoAmpel, SanktionsTreffer } from '../types/antrag';
import { pruefeSanktionen, formuliereSanktionsEinschaetzung } from '../utils/sanktionsAnalyse';

const AMPEL_CONFIG: Record<RisikoAmpel, { color: string; bg: string; border: string; label: string }> = {
  gruen: { color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', label: 'Keine Sanktionseinträge' },
  gelb: { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', label: 'Teilweise geprüft' },
  rot: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Sanktionstreffer!' },
  unbekannt: { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', label: 'Prüfung nicht verfügbar' },
};

interface Props {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
}

const SanktionsPruefPanel: React.FC<Props> = ({ data, onChange }) => {
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const { interessent } = data;
  const analyse = data.sanktionsAnalyse;
  const firmaName = interessent.name.trim();
  const ap = interessent.ansprechpartner;

  const istBereit = firmaName.length >= 3;
  const pruefobjektKey = JSON.stringify([firmaName, ap.vorname, ap.name]);
  // Bei erneutem Mounten (z.B. Tab-Wechsel) nicht sofort neu abfragen, wenn für die
  // aktuellen Eingaben bereits ein Ergebnis vorliegt.
  const lastKeyRef = useRef<string>(analyse ? pruefobjektKey : '');

  useEffect(() => {
    if (!istBereit) return;
    if (pruefobjektKey === lastKeyRef.current) return;

    setLoading(true);
    setFehler(null);
    let aborted = false;

    const debounce = setTimeout(() => {
      lastKeyRef.current = pruefobjektKey;

      pruefeSanktionen(firmaName, [ap])
        .then((result) => { if (!aborted) onChange({ sanktionsAnalyse: result }); })
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
  }, [firmaName, ap.vorname, ap.name]);

  if (!istBereit) {
    return (
      <Box sx={{ p: 3, bgcolor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 2, textAlign: 'center' }}>
        <Typography sx={{ color: '#94A3B8', fontSize: '0.85rem' }}>
          Bitte Firmenname auf Reiter 1 eintragen, um die Sanktionsprüfung zu starten.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2 }}>
        <CircularProgress size={20} />
        <Typography sx={{ color: '#64748B', fontSize: '0.85rem' }}>
          UN Security Council Consolidated List wird abgefragt …
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

  return (
    <Box>
      {/* Gesamtstatus */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 2, mb: 2 }}>
        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Sanktionsstatus
          </Typography>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: c.color }}>{c.label}</Typography>
        </Box>
        <Box sx={{ fontSize: '0.72rem', color: '#94A3B8', textAlign: 'right' }}>
          <div>Geprüft: {new Date(analyse.geprueftAm).toLocaleDateString('de-DE')}</div>
          <div>Quelle: UN Security Council</div>
        </Box>
      </Box>

      {/* Geprüfte Objekte */}
      <Box sx={{ mb: 2, p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
          Geprüfte Objekte
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`Firma: ${analyse.gepruefteFirma}`}
            size="small"
            sx={{ fontSize: '0.72rem', bgcolor: '#E0E7FF', color: '#3730A3', border: '1px solid #C7D2FE' }}
          />
          {analyse.geprueftePersonen.map((p) => (
            <Chip
              key={p}
              label={`Person: ${p}`}
              size="small"
              sx={{ fontSize: '0.72rem', bgcolor: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD' }}
            />
          ))}
        </Box>
      </Box>

      {/* Sanktionstreffer */}
      {analyse.treffer.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
            Sanktionseinträge ({analyse.treffer.length})
          </Typography>
          {analyse.treffer.map((t: SanktionsTreffer, i: number) => (
            <Box key={i} sx={{ mb: 1, p: 2, bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip
                  label={t.quelle}
                  size="small"
                  sx={{ fontSize: '0.68rem', fontWeight: 700, bgcolor: t.quelle === 'EU' ? '#EDE9FE' : '#FFF7ED', color: t.quelle === 'EU' ? '#5B21B6' : '#C2410C' }}
                />
                <Chip
                  label={t.typ}
                  size="small"
                  sx={{ fontSize: '0.68rem', bgcolor: '#F1F5F9', color: '#475569' }}
                />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#DC2626' }}>{t.name}</Typography>
              </Box>
              {t.regelung && (
                <Typography sx={{ fontSize: '0.75rem', color: '#64748B', mt: 0.5 }}>{t.regelung}</Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Teilfehler-Hinweis */}
      {analyse.fehler && (
        <Box sx={{ p: 1.5, bgcolor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 2, fontSize: '0.75rem', color: '#B45309', mb: 2 }}>
          <strong>Hinweis:</strong> {analyse.fehler}
        </Box>
      )}

      {/* Einschätzung */}
      <Box sx={{ p: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <GavelIcon sx={{ fontSize: 15, color: '#475569' }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Einschätzung
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.82rem', color: '#1E293B', lineHeight: 1.6 }}>
          {formuliereSanktionsEinschaetzung(analyse)}
        </Typography>
      </Box>
    </Box>
  );
};

export default SanktionsPruefPanel;
