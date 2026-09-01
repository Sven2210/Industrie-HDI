import React, { useMemo } from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AirIcon from '@mui/icons-material/Air';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import EnergySavingsLeafIcon from '@mui/icons-material/EnergySavingsLeaf';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import type { AntragData, RisikoAmpel, UmweltrisikoAnalyse, UmweltrisikoKategorie } from '../types/antrag';
import { analysiereUmweltrisiko, formuliereUmweltrisikoEinschaetzung } from '../utils/umweltrisikoAnalyse';

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

interface KategorieConfig {
  key: keyof Omit<UmweltrisikoAnalyse, 'ampel' | 'branchenerkannt' | 'analysiertAm'>;
  label: string;
  icon: React.ReactNode;
}

const KATEGORIEN: KategorieConfig[] = [
  { key: 'luftemissionen', label: 'Luftemissionen', icon: <AirIcon sx={{ fontSize: 16 }} /> },
  { key: 'gewaesserBoden', label: 'Gewässer- und Bodenkontamination', icon: <WaterDropIcon sx={{ fontSize: 16 }} /> },
  { key: 'abfall', label: 'Abfall- und Sondermüllaufkommen', icon: <DeleteOutlineIcon sx={{ fontSize: 16 }} /> },
  { key: 'laerm', label: 'Lärmemissionen', icon: <VolumeUpIcon sx={{ fontSize: 16 }} /> },
  { key: 'brandExplosion', label: 'Brand- und Explosionsrisiko für die Umwelt', icon: <WhatshotIcon sx={{ fontSize: 16 }} /> },
];

function GesamtScore({ analyse }: { analyse: UmweltrisikoAnalyse }) {
  const c = AMPEL_CONFIG[analyse.ampel];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 2, mb: 2 }}>
      <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
      <Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Gesamtrisiko Umweltauswirkung
        </Typography>
        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: c.color }}>{c.label}</Typography>
      </Box>
      <Box sx={{ ml: 'auto', fontSize: '0.72rem', color: '#94A3B8' }}>
        Analysiert: {new Date(analyse.analysiertAm).toLocaleDateString('de-DE')}
      </Box>
    </Box>
  );
}

function istBereit(betriebsarten: string[]): boolean {
  return betriebsarten.some((b) => b.trim().length > 0);
}

interface Props {
  data: AntragData;
}

const UmweltrisikoPanel: React.FC<Props> = ({ data }) => {
  const betriebsarten = data.anbahnungsdaten.sparten.map((s) => s.betriebsart).filter(Boolean);
  const betriebsbeschreibung = data.anbahnungsdaten.betriebsbeschreibung;
  const bereit = istBereit(betriebsarten);
  const dokumentHinweise = data.analyse?.hinweise ?? [];

  const analyse = useMemo(
    () => (bereit ? analysiereUmweltrisiko(betriebsarten, betriebsbeschreibung) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(betriebsarten), betriebsbeschreibung, bereit]
  );

  if (!bereit || !analyse) {
    return (
      <Box sx={{ p: 3, bgcolor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 2, textAlign: 'center' }}>
        <Typography sx={{ color: '#94A3B8', fontSize: '0.85rem' }}>
          Bitte Betriebsart auf Reiter 2 (Anbahnungsdaten) angeben, um die Umweltrisikoanalyse zu starten.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <GesamtScore analyse={analyse} />

      {!analyse.branchenerkannt && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 2, fontSize: '0.75rem', color: '#B45309' }}>
          <strong>Hinweis:</strong> Die angegebene Betriebsart konnte keiner hinterlegten Branche zugeordnet werden. Die Bewertung basiert auf keiner spezifischen Wissensbasis — bitte manuell einschätzen.
        </Box>
      )}

      {KATEGORIEN.map(({ key, label, icon }) => {
        const kategorie = analyse[key] as UmweltrisikoKategorie;
        const c = AMPEL_CONFIG[kategorie.ampel];
        const passendeHinweise = dokumentHinweise.filter((h) => h.bereich === 'umweltrisiko' && h.kategorie === key);
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
                <AmpelChip ampel={kategorie.ampel} />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pb: 2, pt: 1 }}>
              <Typography sx={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.6 }}>
                {kategorie.begruendung}
              </Typography>
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
          <EnergySavingsLeafIcon sx={{ fontSize: 15, color: '#475569' }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Einschätzung
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.82rem', color: '#1E293B', lineHeight: 1.6 }}>
          {formuliereUmweltrisikoEinschaetzung(analyse)}
        </Typography>
      </Box>
    </Box>
  );
};

export default UmweltrisikoPanel;
