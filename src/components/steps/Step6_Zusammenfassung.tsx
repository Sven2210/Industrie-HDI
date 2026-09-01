import React, { useMemo, useState } from 'react';
import {
  Box, Grid, Typography, Button, Chip, Divider, CircularProgress,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EuroIcon from '@mui/icons-material/Euro';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import type { AntragData } from '../../types/antrag';
import { RISIKOBELEGENHEIT_LABELS } from '../../types/antrag';
import {
  calcVorschlagsbeitragssatz,
  calcJahresnettobeitrag,
  calcJahresbruttobeitrag,
} from '../../utils/calculations';
import { parseFormattedNumber } from '../../utils/format';
import { generateVorschlagPDF } from '../../utils/pdfGenerator';

interface Props {
  data: AntragData;
  onSave: () => void;
}

const SummaryBlock: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <Box sx={{ p: 2.5, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2.5, mb: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>{title}</Typography>
    </Box>
    {children}
  </Box>
);

const FieldRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 0.5, borderBottom: '1px dashed #F1F5F9', '&:last-child': { borderBottom: 'none' } }}>
    <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>{label}</Typography>
    <Typography sx={{ fontSize: highlight ? '0.88rem' : '0.82rem', fontWeight: highlight ? 700 : 600, color: highlight ? '#1D4ED8' : '#0F172A', textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</Typography>
  </Box>
);

const Step6_Zusammenfassung: React.FC<Props> = ({ data, onSave }) => {
  const [genPdf, setGenPdf] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);

  const abs = useMemo(() => calcVorschlagsbeitragssatz(data.risikokalkulation), [data.risikokalkulation]);
  const kalk = data.risikokalkulation;
  const ab = data.anbahnungsdaten;

  const beitraege = useMemo(() => {
    return data.unternehmen.map((u) => {
      const umsatz = parseFormattedNumber(u.jahresumsatz);
      const steuer = parseFormattedNumber(u.steuersatz);
      const mindest = parseFormattedNumber(u.mindestbeitrag);
      const netto = calcJahresnettobeitrag(umsatz, abs);
      const effNetto = mindest > 0 ? Math.max(netto, mindest) : netto;
      const brutto = calcJahresbruttobeitrag(effNetto, steuer);
      return { ...u, effNetto, brutto };
    });
  }, [data.unternehmen, abs]);

  const nettoGesamt = beitraege.reduce((s, b) => s + b.effNetto, 0);
  const bruttoGesamt = beitraege.reduce((s, b) => s + b.brutto, 0);

  const handleGeneratePDF = () => {
    setGenPdf(true);
    setTimeout(() => {
      try {
        generateVorschlagPDF(data);
        setPdfDone(true);
        onSave();
      } finally {
        setGenPdf(false);
      }
    }, 500);
  };

  const hochRisiken = data.risikocheck.filter((r) => r.value === 'hoch' || r.value === 'ja').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2.5, bgcolor: pdfDone ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${pdfDone ? '#BBF7D0' : '#E2E8F0'}`, borderRadius: 2.5 }}>
        {pdfDone ? (
          <CheckCircleIcon sx={{ color: '#10B981', fontSize: 28 }} />
        ) : (
          <PictureAsPdfIcon sx={{ color: '#64748B', fontSize: 28 }} />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: pdfDone ? '#065F46' : '#0F172A' }}>
            {pdfDone ? 'Vorschlag erfolgreich erstellt!' : 'Vorschlag erstellen'}
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: pdfDone ? '#059669' : '#64748B' }}>
            {pdfDone ? 'Das PDF wurde heruntergeladen. Der Vorgang wurde gespeichert.' : 'Prüfen Sie alle Angaben und erstellen Sie den druckfertigen Vorschlag als PDF.'}
          </Typography>
        </Box>
        {!pdfDone && (
          <Button
            variant="contained"
            startIcon={genPdf ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
            onClick={handleGeneratePDF}
            disabled={genPdf}
            sx={{ px: 3, py: 1.25, flexShrink: 0 }}
          >
            Vorschlag erstellen
          </Button>
        )}
      </Box>

      {data.vorgangsnr && (
        <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={`Vorgangsnr.: ${data.vorgangsnr}`} sx={{ fontWeight: 700, bgcolor: '#0B1426', color: '#60A5FA', fontSize: '0.78rem' }} />
          <Chip label={data.status} color={data.status === 'aktiv' ? 'success' : data.status === 'abgelehnt' ? 'error' : 'warning'} size="small" />
        </Box>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 7 }}>
          <SummaryBlock icon={<BusinessIcon sx={{ fontSize: 15 }} />} title="Versicherungsnehmer">
            <FieldRow label="Name" value={`${data.interessent.name}${data.interessent.firmierung ? ' ' + data.interessent.firmierung : ''}`} />
            <FieldRow label="Anschrift" value={`${data.interessent.strasse} ${data.interessent.hausnummer}, ${data.interessent.plz} ${data.interessent.ort}`} />
            {data.interessent.adresszusatz && <FieldRow label="Adresszusatz" value={data.interessent.adresszusatz} />}
          </SummaryBlock>

          <SummaryBlock icon={<BusinessIcon sx={{ fontSize: 15 }} />} title="Vertriebspartner">
            <FieldRow label="Name" value={`${data.vertriebspartner.name}${data.vertriebspartner.firmierung ? ' ' + data.vertriebspartner.firmierung : ''}`} />
            <FieldRow label="VP-Nummer" value={data.vertriebspartner.nummer} />
            <FieldRow label="Anschrift" value={`${data.vertriebspartner.strasse} ${data.vertriebspartner.hausnummer}, ${data.vertriebspartner.plz} ${data.vertriebspartner.ort}`} />
          </SummaryBlock>

          <SummaryBlock icon={<CalendarMonthIcon sx={{ fontSize: 15 }} />} title="Vertragsdaten">
            {(ab.sparten ?? []).map((s, idx) => (
              <FieldRow
                key={s.id}
                label={ab.sparten.length > 1 ? `Sparte ${idx + 1}` : 'Sparte'}
                value={[s.sparte, s.betriebsart].filter(Boolean).join(' · ')}
              />
            ))}
            <FieldRow label="Vertragsbeginn" value={ab.vertragsbeginn} />
            <FieldRow label="Laufzeit" value={ab.laufzeit ? `${ab.laufzeit} Jahr${ab.laufzeit !== '1' ? 'e' : ''}` : ''} />
          </SummaryBlock>

          <SummaryBlock icon={<AccountBalanceIcon sx={{ fontSize: 15 }} />} title="Zeichnungsart">
            <FieldRow label="Art" value={ab.zeichnungsart} />
            {ab.zeichnungsart === 'Beteiligungsgeschäft' && (
              <>
                <FieldRow label="Führender Versicherer" value={ab.beteiligungsgeschaeft.versichererName} />
                <FieldRow label="Anteil" value={ab.beteiligungsgeschaeft.anteil ? `${ab.beteiligungsgeschaeft.anteil} %` : ''} />
                <FieldRow label="Führungsprovision" value={ab.beteiligungsgeschaeft.fuehrungsprovision ? `${ab.beteiligungsgeschaeft.fuehrungsprovision} %` : ''} />
              </>
            )}
          </SummaryBlock>

          <SummaryBlock icon={<GppMaybeIcon sx={{ fontSize: 15 }} />} title="Risikocheck">
            <FieldRow label="Auffällige Risikofaktoren" value={`${hochRisiken} Merkmal${hochRisiken !== 1 ? 'e' : ''} mit hoch/ja bewertet`} />
            <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {data.risikocheck.filter((r) => r.value === 'hoch' || r.value === 'ja').map((r) => (
                <Chip key={r.id} label={r.label} size="small"
                  sx={{ bgcolor: '#FEF2F2', color: '#DC2626', fontSize: '0.65rem', border: '1px solid #FECACA', fontWeight: 600 }} />
              ))}
              {hochRisiken === 0 && <Typography sx={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 600 }}>Keine erhöhten Risikofaktoren</Typography>}
            </Box>
          </SummaryBlock>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <SummaryBlock icon={<EuroIcon sx={{ fontSize: 15 }} />} title="Risikokalkulation">
            <FieldRow label="WKZ" value={kalk.wagniskennziffern.map((w) => `${w.wkz} (${w.tarifbeitragssatz}‰)`).join(', ')} />
            <FieldRow label="Versicherungssumme" value={kalk.versicherungssumme ? `${kalk.versicherungssumme} EUR` : ''} />
            <FieldRow label="Grundbeitragssatz" value={kalk.grundbeitragssatz ? `${kalk.grundbeitragssatz} ‰` : ''} />
            <FieldRow label="Degression" value={kalk.degression ? `${kalk.degression} %` : ''} />
            <FieldRow label="Vorschlagsbeitragssatz" value={abs ? `${abs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ‰` : ''} highlight />
          </SummaryBlock>

          <Box sx={{ p: 2.5, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2.5, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                <BusinessIcon sx={{ fontSize: 15 }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>Mitversicherte Unternehmen</Typography>
            </Box>

            {beitraege.map((b, idx) => (
              <Box key={b.id} sx={{ mb: 2, pb: 2, borderBottom: idx < beitraege.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>
                    {b.name || `Unternehmen ${idx + 1}`}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#64748B' }}>{b.land}</Typography>
                </Box>
                {b.risikobelegenheit && (
                  <Typography sx={{ fontSize: '0.65rem', color: '#94A3B8', mb: 0.75 }}>
                    {RISIKOBELEGENHEIT_LABELS[b.risikobelegenheit]}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Nettobeitrag</Typography>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>{b.effNetto.toLocaleString('de-DE')} EUR</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Brutto</Typography>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>{b.brutto.toLocaleString('de-DE')} EUR</Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>

          {nettoGesamt > 0 && (
            <Box sx={{ p: 3, bgcolor: '#0B1426', borderRadius: 2.5 }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.5 }}>
                Vorschlagspreis
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography sx={{ color: '#60A5FA', fontSize: '0.78rem', fontWeight: 600 }}>Netto gesamt</Typography>
                  <Typography sx={{ color: '#F8FAFC', fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {nettoGesamt.toLocaleString('de-DE')} EUR
                  </Typography>
                </Box>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography sx={{ color: '#475569', fontSize: '0.78rem', fontWeight: 600 }}>Brutto inkl. VSt.</Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {bruttoGesamt.toLocaleString('de-DE')} EUR
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default Step6_Zusammenfassung;
