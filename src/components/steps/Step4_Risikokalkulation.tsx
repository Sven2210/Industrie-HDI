import React, { useMemo } from 'react';
import {
  Box, Grid, TextField, Typography, Button, IconButton,
  Divider, Alert,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SectionCard from '../SectionCard';
import type { AntragData, WKZEntry, ZuAbschlag } from '../../types/antrag';
import { calcRisikobeitragssatz, calcVorschlagsbeitragssatz } from '../../utils/calculations';
import { parseFormattedNumber, formatNumberInput } from '../../utils/format';

interface Props {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
}

const newId = () => Date.now().toString();

const ZuAbschlagRow: React.FC<{
  item: ZuAbschlag;
  typ: 'zuschlag' | 'abschlag';
  onUpdate: (id: string, field: keyof ZuAbschlag, val: string) => void;
  onDelete: (id: string) => void;
}> = ({ item, typ, onUpdate, onDelete }) => (
  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1 }}>
    <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: typ === 'zuschlag' ? '#FFF7ED' : '#F0FDF4', flexShrink: 0 }}>
      {typ === 'zuschlag' ? <TrendingUpIcon sx={{ fontSize: 15, color: '#C2410C' }} /> : <TrendingDownIcon sx={{ fontSize: 15, color: '#15803D' }} />}
    </Box>
    <TextField
      size="small" label="%" value={item.prozent}
      onChange={(e) => onUpdate(item.id, 'prozent', e.target.value)}
      sx={{ width: 90 }}
      slotProps={{ input: { endAdornment: <Typography sx={{ fontSize: '0.82rem', color: '#94A3B8' }}>%</Typography> } }}
    />
    <TextField
      size="small" label="Bezeichnung" value={item.bezeichnung} fullWidth
      onChange={(e) => onUpdate(item.id, 'bezeichnung', e.target.value)}
      placeholder={typ === 'zuschlag' ? 'z. B. Exportzuschlag' : 'z. B. Vertriebsrabatt'}
    />
    <IconButton size="small" onClick={() => onDelete(item.id)} sx={{ color: '#FDA4AF', '&:hover': { color: '#EF4444' } }}>
      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
    </IconButton>
  </Box>
);

const Step4_Risikokalkulation: React.FC<Props> = ({ data, onChange }) => {
  const kalk = data.risikokalkulation;

  const updateKalk = (field: string, value: unknown) =>
    onChange({ risikokalkulation: { ...kalk, [field]: value } });

  const updateWKZ = (id: string, field: keyof WKZEntry, val: string) =>
    updateKalk('wagniskennziffern', kalk.wagniskennziffern.map((w) => w.id === id ? { ...w, [field]: val } : w));

  const addWKZ = () =>
    updateKalk('wagniskennziffern', [...kalk.wagniskennziffern, { id: newId(), wkz: '', tarifbeitragssatz: '' }]);

  const removeWKZ = (id: string) =>
    updateKalk('wagniskennziffern', kalk.wagniskennziffern.filter((w) => w.id !== id));

  const addZuschlag = (type: 'VS' | 'RBS') => {
    const key = type === 'VS' ? 'zuschlaegeVS' : 'zuschlaegeRBS';
    updateKalk(key, [...kalk[key], { id: newId(), prozent: '', bezeichnung: '' }]);
  };

  const addAbschlag = (type: 'VS' | 'RBS') => {
    const key = type === 'VS' ? 'abschlaegeVS' : 'abschlaegeRBS';
    updateKalk(key, [...kalk[key], { id: newId(), prozent: '', bezeichnung: '' }]);
  };

  const updateZuAbschlag = (type: 'zuschlaegeVS' | 'abschlaegeVS' | 'zuschlaegeRBS' | 'abschlaegeRBS', id: string, field: keyof ZuAbschlag, val: string) => {
    updateKalk(type, kalk[type].map((z: ZuAbschlag) => z.id === id ? { ...z, [field]: val } : z));
  };

  const deleteZuAbschlag = (type: 'zuschlaegeVS' | 'abschlaegeVS' | 'zuschlaegeRBS' | 'abschlaegeRBS', id: string) => {
    updateKalk(type, kalk[type].filter((z: ZuAbschlag) => z.id !== id));
  };

  const rbs = useMemo(() => calcRisikobeitragssatz(kalk), [kalk]);
  const abs = useMemo(() => calcVorschlagsbeitragssatz(kalk), [kalk]);

  const gbs = parseFormattedNumber(kalk.grundbeitragssatz);
  const deg = parseFormattedNumber(kalk.degression);
  const vs = parseFormattedNumber(kalk.versicherungssumme);
  const jahresnetto = vs && abs ? Math.round(vs * abs / 1000) : 0;

  const calcLabel = (val: number) => val ? val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + ' ‰' : '—';

  return (
    <Box>
      <Typography sx={{ color: '#64748B', fontSize: '0.85rem', mb: 3 }}>
        Hinterlegen Sie die Wagniskennziffer, begründen Sie ggf. Anpassungen und kalkulieren Sie den Vorschlagsbeitragssatz.
      </Typography>

      {/* WKZ & Tarifbeitragssatz */}
      <SectionCard icon={<CalculateIcon sx={{ fontSize: 17 }} />} title="Wagniskennziffer & Tarifbeitragssatz" subtitle="Referenzwerte aus dem Tarif" accent>
        <Box sx={{ mb: 2 }}>
          {kalk.wagniskennziffern.map((w, idx) => (
            <Box key={w.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1.5 }}>
              <TextField size="small" label="WKZ" value={w.wkz}
                onChange={(e) => updateWKZ(w.id, 'wkz', e.target.value)}
                sx={{ width: 160 }} placeholder="z. B. 873647" />
              <TextField size="small" label="Tarifbeitragssatz" value={w.tarifbeitragssatz}
                onChange={(e) => updateWKZ(w.id, 'tarifbeitragssatz', e.target.value)}
                sx={{ width: 150 }}
                slotProps={{ input: { endAdornment: <Typography sx={{ fontSize: '0.82rem', color: '#94A3B8' }}>‰</Typography> } }} />
              {idx > 0 && (
                <IconButton size="small" onClick={() => removeWKZ(w.id)} sx={{ color: '#FDA4AF' }}>
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={addWKZ}
            sx={{ color: '#2563EB', fontWeight: 600, fontSize: '0.78rem', textTransform: 'none', mt: 0.5 }}>
            Wagniskennziffer hinzufügen
          </Button>
        </Box>

        <TextField fullWidth multiline rows={2} size="small"
          label="Begründung zur Anpassung des Tarifbeitragssatzes"
          value={kalk.begruendung}
          onChange={(e) => updateKalk('begruendung', e.target.value)}
          placeholder="Begründen Sie Abweichungen vom Tarifbeitragssatz..." />

        <Box sx={{ mt: 2.5, p: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
            Risikogerechter Beitragssatz
          </Typography>
          <TextField size="small" value={kalk.risikogerechterBeitragssatz}
            onChange={(e) => updateKalk('risikogerechterBeitragssatz', e.target.value)}
            sx={{ width: 200 }}
            slotProps={{ input: { endAdornment: <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>‰</Typography> } }} />
        </Box>
      </SectionCard>

      {/* Berechnung */}
      <SectionCard icon={<CalculateIcon sx={{ fontSize: 17 }} />} title="Berechnung" subtitle="Beitragssatz-Kalkulation">

        {/* Versicherungssumme */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
            Versicherungssumme
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField size="small" label="EUR" value={kalk.versicherungssumme}
              onChange={(e) => updateKalk('versicherungssumme', formatNumberInput(e.target.value))}
              sx={{ width: 200 }}
              slotProps={{ input: { endAdornment: <Typography sx={{ fontSize: '0.82rem', color: '#94A3B8' }}>EUR</Typography> } }} />
            <Button size="small" variant="outlined" startIcon={<TrendingUpIcon />} onClick={() => addZuschlag('VS')}
              sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#C2410C', borderColor: '#FED7AA' }}>
              + Zuschlag
            </Button>
            <Button size="small" variant="outlined" startIcon={<TrendingDownIcon />} onClick={() => addAbschlag('VS')}
              sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#15803D', borderColor: '#BBF7D0' }}>
              + Abschlag
            </Button>
          </Box>
          {kalk.zuschlaegeVS.map((z) => (
            <Box sx={{ mt: 1, ml: 2 }} key={z.id}>
              <ZuAbschlagRow item={z} typ="zuschlag" onUpdate={(id, f, v) => updateZuAbschlag('zuschlaegeVS', id, f, v)} onDelete={(id) => deleteZuAbschlag('zuschlaegeVS', id)} />
            </Box>
          ))}
          {kalk.abschlaegeVS.map((a) => (
            <Box sx={{ mt: 1, ml: 2 }} key={a.id}>
              <ZuAbschlagRow item={a} typ="abschlag" onUpdate={(id, f, v) => updateZuAbschlag('abschlaegeVS', id, f, v)} onDelete={(id) => deleteZuAbschlag('abschlaegeVS', id)} />
            </Box>
          ))}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* GBS → RBS calculation chain */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Grundbeitragssatz */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
                Grundbeitragssatz
              </Typography>
              <TextField size="small" value={kalk.grundbeitragssatz}
                onChange={(e) => updateKalk('grundbeitragssatz', e.target.value)}
                sx={{ width: 180 }}
                slotProps={{ input: { endAdornment: <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>‰</Typography> } }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
                Degression
              </Typography>
              <TextField size="small" value={kalk.degression}
                onChange={(e) => updateKalk('degression', e.target.value)}
                sx={{ width: 140 }} placeholder="z. B. 15"
                slotProps={{ input: { endAdornment: <Typography sx={{ fontSize: '0.9rem', color: '#64748B' }}>%</Typography> } }} />
            </Box>
            {gbs > 0 && deg > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748B' }}>
                <ArrowForwardIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: '0.78rem', color: '#475569' }}>
                  {gbs.toLocaleString('de-DE', { maximumFractionDigits: 3 })} × {(1 - deg / 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} =
                </Typography>
              </Box>
            )}
          </Box>

          {/* Risikobeitragssatz */}
          <Box sx={{ p: 2, bgcolor: rbs > 0 ? '#EFF6FF' : '#F8FAFC', border: `2px solid ${rbs > 0 ? '#DBEAFE' : '#E2E8F0'}`, borderRadius: 2, mb: 2 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
              Risikobeitragssatz
            </Typography>
            <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: rbs > 0 ? '#1D4ED8' : '#CBD5E1', letterSpacing: '-0.02em' }}>
              {calcLabel(rbs)}
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: '#94A3B8', mt: 0.25 }}>
              {gbs > 0 ? `${gbs} ‰ ${deg > 0 ? `× (1 − ${deg}%)` : ''}` : 'Grundbeitragssatz eingeben'}
            </Typography>

            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" startIcon={<TrendingUpIcon />} onClick={() => addZuschlag('RBS')}
                sx={{ textTransform: 'none', fontSize: '0.72rem', color: '#C2410C', borderColor: '#FED7AA' }}>
                + Zuschlag
              </Button>
              <Button size="small" variant="outlined" startIcon={<TrendingDownIcon />} onClick={() => addAbschlag('RBS')}
                sx={{ textTransform: 'none', fontSize: '0.72rem', color: '#15803D', borderColor: '#BBF7D0' }}>
                + Abschlag
              </Button>
            </Box>

            {kalk.zuschlaegeRBS.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                {kalk.zuschlaegeRBS.map((z) => (
                  <ZuAbschlagRow key={z.id} item={z} typ="zuschlag" onUpdate={(id, f, v) => updateZuAbschlag('zuschlaegeRBS', id, f, v)} onDelete={(id) => deleteZuAbschlag('zuschlaegeRBS', id)} />
                ))}
              </Box>
            )}
            {kalk.abschlaegeRBS.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {kalk.abschlaegeRBS.map((a) => (
                  <ZuAbschlagRow key={a.id} item={a} typ="abschlag" onUpdate={(id, f, v) => updateZuAbschlag('abschlaegeRBS', id, f, v)} onDelete={(id) => deleteZuAbschlag('abschlaegeRBS', id)} />
                ))}
              </Box>
            )}
          </Box>

          {/* Vorschlagsbeitragssatz */}
          <Box sx={{ p: 2.5, bgcolor: abs > 0 ? '#0B1426' : '#F1F5F9', borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: abs > 0 ? '#60A5FA' : '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
              Vorschlagsbeitragssatz
            </Typography>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: abs > 0 ? '#F8FAFC' : '#CBD5E1', letterSpacing: '-0.03em' }}>
              {calcLabel(abs)}
            </Typography>
            {vs > 0 && abs > 0 && (
              <Typography sx={{ fontSize: '0.75rem', color: '#475569', mt: 0.5 }}>
                → Jahresnettobeitrag (Basis): <strong style={{ color: '#60A5FA' }}>{jahresnetto.toLocaleString('de-DE')} EUR</strong>
              </Typography>
            )}
          </Box>
        </Box>
      </SectionCard>

      {!gbs && (
        <Alert severity="info" sx={{ mt: 0 }}>
          Tragen Sie den Grundbeitragssatz ein, um die automatische Berechnung zu starten.
        </Alert>
      )}

      {/* Summary Grid */}
      {abs > 0 && (
        <Box sx={{ mt: 2, p: 2.5, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 3, boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>Kalkulationsübersicht</Typography>
          <Grid container spacing={2}>
            {[
              { label: 'WKZ Tarifbeitragssatz', value: kalk.wagniskennziffern[0]?.tarifbeitragssatz ? `${kalk.wagniskennziffern[0].tarifbeitragssatz} ‰` : '—' },
              { label: 'Risikogerechter Satz', value: kalk.risikogerechterBeitragssatz ? `${kalk.risikogerechterBeitragssatz} ‰` : '—' },
              { label: 'Grundbeitragssatz', value: gbs ? `${gbs.toLocaleString('de-DE', { maximumFractionDigits: 3 })} ‰` : '—' },
              { label: 'Degression', value: deg ? `${deg} %` : '—' },
              { label: 'Risikobeitragssatz', value: calcLabel(rbs) },
              { label: 'Vorschlagsbeitragssatz', value: calcLabel(abs) },
            ].map(({ label, value }) => (
              <Grid size={{ xs: 6, sm: 4 }} key={label}>
                <Typography sx={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', mt: 0.25 }}>{value}</Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default Step4_Risikokalkulation;
