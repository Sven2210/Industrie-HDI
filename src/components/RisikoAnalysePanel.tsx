import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails,
  CircularProgress, Chip, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WaterIcon from '@mui/icons-material/Water';
import AirIcon from '@mui/icons-material/Air';
import PublicIcon from '@mui/icons-material/Public';
import GrainIcon from '@mui/icons-material/Grain';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import type { AntragData, RisikoAnalyse, RisikoAmpel, NaturgefahrBewertung, Wagnisanschrift } from '../types/antrag';
import { analysiereRisiko, formuliereRisikoEinschaetzung } from '../utils/risikoAnalyse';
import UmweltrisikoPanel from './UmweltrisikoPanel';

// ── Ampel-Hilfsfunktionen ──────────────────────────────────────────────────────

const AMPEL_CONFIG: Record<RisikoAmpel, { color: string; bg: string; border: string; label: string }> = {
  gruen: { color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', label: 'Gering' },
  gelb: { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', label: 'Mittel' },
  rot: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Hoch' },
  unbekannt: { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', label: 'Unbekannt' },
};

function AmpelChip({ ampel }: { ampel: RisikoAmpel }) {
  const c = AMPEL_CONFIG[ampel];
  return (
    <Chip
      label={c.label}
      size="small"
      sx={{ bgcolor: c.bg, color: c.color, border: `1px solid ${c.border}`, fontWeight: 700, fontSize: '0.7rem' }}
    />
  );
}

// ── Gefahren-Konfiguration ─────────────────────────────────────────────────────

interface GefahrConfig {
  key: keyof Omit<RisikoAnalyse, 'lat' | 'lon' | 'gesamtAmpel' | 'analysiertAm'>;
  label: string;
  icon: React.ReactNode;
}

const GEFAHREN: GefahrConfig[] = [
  { key: 'hochwasser', label: 'Hochwasser / Überschwemmung', icon: <WaterIcon sx={{ fontSize: 16 }} /> },
  { key: 'sturm', label: 'Sturm / Orkan', icon: <AirIcon sx={{ fontSize: 16 }} /> },
  { key: 'erdbeben', label: 'Erdbeben', icon: <PublicIcon sx={{ fontSize: 16 }} /> },
  { key: 'hagel', label: 'Hagel', icon: <GrainIcon sx={{ fontSize: 16 }} /> },
  { key: 'waldbrand', label: 'Waldbrand', icon: <LocalFireDepartmentIcon sx={{ fontSize: 16 }} /> },
  { key: 'schnee', label: 'Schnee- / Eislast', icon: <AcUnitIcon sx={{ fontSize: 16 }} /> },
];

// ── Karte ──────────────────────────────────────────────────────────────────────

function RisikoKarte({ analyse }: { analyse: RisikoAnalyse }) {
  const delta = 0.06;
  const bbox = `${analyse.lon - delta},${analyse.lat - delta},${analyse.lon + delta},${analyse.lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${analyse.lat},${analyse.lon}`;

  return (
    <Box sx={{ height: 320, borderRadius: 2, border: '1px solid #E2E8F0', mb: 3, overflow: 'hidden' }}>
      <iframe
        title="Standortkarte"
        src={src}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        loading="lazy"
      />
    </Box>
  );
}

// ── Gesamtscore ────────────────────────────────────────────────────────────────

function GesamtScore({ analyse }: { analyse: RisikoAnalyse }) {
  const c = AMPEL_CONFIG[analyse.gesamtAmpel];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 2, mb: 3 }}>
      <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
      <Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Gesamtrisiko Naturgefahren
        </Typography>
        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: c.color }}>
          {c.label}
        </Typography>
      </Box>
      <Box sx={{ ml: 'auto', fontSize: '0.72rem', color: '#94A3B8' }}>
        Analysiert: {new Date(analyse.analysiertAm).toLocaleDateString('de-DE')}
      </Box>
    </Box>
  );
}

// ── Hauptkomponente ────────────────────────────────────────────────────────────

function istAdresseVollstaendig(wa: Wagnisanschrift): boolean {
  return !!(wa.strasse && wa.hausnummer && wa.plz && wa.ort && wa.land);
}

interface Props {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
}

const RisikoAnalysePanel: React.FC<Props> = ({ data, onChange }) => {
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const wa = data.wagnisanschrift;
  const analyse = data.risikoAnalyse;
  const dokumentHinweise = data.analyse?.hinweise ?? [];
  // Bei erneutem Mounten (z.B. Tab-Wechsel) nicht sofort neu abfragen, wenn für die
  // aktuellen Eingaben bereits ein Ergebnis vorliegt.
  const lastAdresseRef = useRef<string>(analyse ? JSON.stringify([wa.strasse, wa.hausnummer, wa.plz, wa.ort, wa.land]) : '');

  useEffect(() => {
    if (!istAdresseVollstaendig(wa)) return;
    const adresseKey = JSON.stringify([wa.strasse, wa.hausnummer, wa.plz, wa.ort, wa.land]);
    if (adresseKey === lastAdresseRef.current) return;

    setLoading(true);
    setFehler(null);
    let aborted = false;

    const debounce = setTimeout(() => {
      lastAdresseRef.current = adresseKey;

      analysiereRisiko(wa)
        .then((result) => { if (!aborted) onChange({ risikoAnalyse: result }); })
        .catch((e) => {
          if (!aborted) {
            lastAdresseRef.current = '';
            setFehler(e.message ?? 'Analyse fehlgeschlagen');
          }
        })
        .finally(() => { if (!aborted) setLoading(false); });
    }, 800);

    return () => {
      clearTimeout(debounce);
      aborted = true;
    };
  }, [wa.strasse, wa.hausnummer, wa.plz, wa.ort, wa.land]);

  const adresseVollstaendig = istAdresseVollstaendig(wa);

  return (
    <Box sx={{ mb: 3 }}>
      {/* ── Unterpunkt 1: Naturgefahren am Standort ─────────────────────────── */}
      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', mb: 1.5 }}>
        1. Naturgefahren am Standort
      </Typography>

      {!adresseVollstaendig && (
        <Box sx={{ p: 3, bgcolor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 2, textAlign: 'center', mb: 3 }}>
          <Typography sx={{ color: '#94A3B8', fontSize: '0.85rem' }}>
            Bitte Wagnisanschrift auf Reiter 1 vollständig ausfüllen, um die Risikoanalyse zu starten.
          </Typography>
        </Box>
      )}

      {adresseVollstaendig && loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, mb: 3 }}>
          <CircularProgress size={20} />
          <Typography sx={{ color: '#64748B', fontSize: '0.85rem' }}>
            Risikoanalyse wird durchgeführt …
          </Typography>
        </Box>
      )}

      {adresseVollstaendig && !loading && fehler && (
        <Box sx={{ p: 2, bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 2, mb: 3 }}>
          <Typography sx={{ color: '#DC2626', fontSize: '0.85rem' }}>Fehler: {fehler}</Typography>
        </Box>
      )}

      {adresseVollstaendig && !loading && !fehler && analyse && (
        <Box sx={{ mb: 3 }}>
          <RisikoKarte analyse={analyse} />
          <GesamtScore analyse={analyse} />
          <Divider sx={{ mb: 2 }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
            Einzelbewertung je Naturgefahr
          </Typography>
          {GEFAHREN.map(({ key, label, icon }) => {
            const bewertung = analyse[key] as NaturgefahrBewertung;
            const c = AMPEL_CONFIG[bewertung.ampel];
            const passendeHinweise = dokumentHinweise.filter((h) => h.bereich === 'naturgefahr' && h.kategorie === key);
            return (
              <Accordion key={key} disableGutters elevation={0}
                sx={{ border: '1px solid #E2E8F0', borderRadius: '8px !important', mb: 1, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
                  sx={{ minHeight: 48, px: 2, bgcolor: '#FAFAFA', borderRadius: '8px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                    <Box sx={{ color: c.color }}>{icon}</Box>
                    <Typography sx={{ fontSize: '0.83rem', fontWeight: 600, color: '#0F172A', flex: 1 }}>{label}</Typography>
                    {passendeHinweise.length > 0 && (
                      <DescriptionOutlinedIcon sx={{ fontSize: 16, color: '#C2410C' }} titleAccess="Hinweis aus hochgeladenem Dokument" />
                    )}
                    <AmpelChip ampel={bewertung.ampel} />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2, pb: 2, pt: 1 }}>
                  {Object.entries(bewertung.details).map(([k, v]) => (
                    <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #F1F5F9' }}>
                      <Typography sx={{ fontSize: '0.78rem', color: '#64748B' }}>{k}</Typography>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#0F172A' }}>{v}</Typography>
                    </Box>
                  ))}
                  {passendeHinweise.map((h, i) => (
                    <Box key={i} sx={{ mt: 1.5, p: 1.5, bgcolor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 1.5 }}>
                      <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: '#9A3412', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.5 }}>
                        Hinweis aus Dokument
                      </Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: '#7C2D12', fontStyle: 'italic' }}>
                        „{h.ausschnitt}"
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9A3412', mt: 0.5 }}>
                        Quelle: {h.quelle}
                      </Typography>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            );
          })}

          {/* Einschätzung */}
          <Box sx={{ mt: 3, p: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <GppMaybeIcon sx={{ fontSize: 15, color: '#475569' }} />
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Einschätzung
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.82rem', color: '#1E293B', lineHeight: 1.6 }}>
              {formuliereRisikoEinschaetzung(analyse)}
            </Typography>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* ── Unterpunkt 2: Umweltrisiko durch Geschäftstätigkeit ─────────────── */}
      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', mb: 1.5 }}>
        2. Umweltrisiko durch Geschäftstätigkeit
      </Typography>
      <UmweltrisikoPanel data={data} />
    </Box>
  );
};

export default RisikoAnalysePanel;
