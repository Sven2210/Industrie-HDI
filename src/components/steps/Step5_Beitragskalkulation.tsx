import React, { useMemo } from 'react';
import {
  Box, Grid, TextField, Typography, MenuItem, Button, IconButton,
  Chip, Divider, Alert,
} from '@mui/material';
import EuroIcon from '@mui/icons-material/Euro';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import BusinessIcon from '@mui/icons-material/Business';
import SectionCard from '../SectionCard';
import type { AntragData, Unternehmen, Risikobelegenheit } from '../../types/antrag';
import { RISIKOBELEGENHEIT_LABELS } from '../../types/antrag';
import {
  calcVorschlagsbeitragssatz,
  calcJahresnettobeitrag,
  calcJahresbruttobeitrag,
  COUNTRY_TAX_RATES,
} from '../../utils/calculations';
import { parseFormattedNumber, formatNumberInput } from '../../utils/format';

interface Props {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
}

const COUNTRIES = Object.keys(COUNTRY_TAX_RATES);

const UnternehmenCard: React.FC<{
  item: Unternehmen;
  index: number;
  abs: number;
  canDelete: boolean;
  onUpdate: (id: string, field: keyof Unternehmen, val: string) => void;
  onDelete: (id: string) => void;
}> = ({ item, index, abs, canDelete, onUpdate, onDelete }) => {
  const umsatz = parseFormattedNumber(item.jahresumsatz);
  const steuer = parseFormattedNumber(item.steuersatz);
  const mindest = parseFormattedNumber(item.mindestbeitrag);
  const netto = calcJahresnettobeitrag(umsatz, abs);
  const effNetto = mindest > 0 ? Math.max(netto, mindest) : netto;
  const brutto = calcJahresbruttobeitrag(effNetto, steuer);

  const handleLandChange = (land: string) => {
    onUpdate(item.id, 'land', land);
    const defaultTax = COUNTRY_TAX_RATES[land];
    if (defaultTax !== undefined) onUpdate(item.id, 'steuersatz', String(defaultTax));
  };

  return (
    <Box sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: 2.5, mb: 2, bgcolor: '#FAFAFA', position: 'relative' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BusinessIcon sx={{ fontSize: 14, color: 'white' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>
            Unternehmen {index + 1}
            {item.name && <Box component="span" sx={{ color: '#64748B', fontWeight: 500 }}> · {item.name}</Box>}
          </Typography>
        </Box>
        {canDelete && (
          <IconButton size="small" onClick={() => onDelete(item.id)} sx={{ color: '#FDA4AF', '&:hover': { color: '#EF4444' } }}>
            <DeleteOutlineIcon sx={{ fontSize: 17 }} />
          </IconButton>
        )}
      </Box>

      {/* Risikobelegenheit */}
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
          Risikobelegenheit *
        </Typography>
        <TextField fullWidth select size="small" value={item.risikobelegenheit}
          onChange={(e) => onUpdate(item.id, 'risikobelegenheit', e.target.value)}>
          <MenuItem value=""><em>— bitte auswählen —</em></MenuItem>
          {(Object.keys(RISIKOBELEGENHEIT_LABELS) as Risikobelegenheit[]).map((k) => (
            <MenuItem key={k} value={k} sx={{ fontSize: '0.82rem', whiteSpace: 'normal' }}>
              {RISIKOBELEGENHEIT_LABELS[k]}
            </MenuItem>
          ))}
        </TextField>
        {item.risikobelegenheit && (
          <Chip label={RISIKOBELEGENHEIT_LABELS[item.risikobelegenheit]} size="small" sx={{ mt: 0.75, bgcolor: '#EFF6FF', color: '#1D4ED8', fontSize: '0.68rem', border: '1px solid #DBEAFE' }} />
        )}
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Name des Unternehmens" value={item.name}
            onChange={(e) => onUpdate(item.id, 'name', e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth select size="small" label="Land" value={item.land}
            onChange={(e) => handleLandChange(e.target.value)}>
            {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Jahresumsatz (EUR)" value={item.jahresumsatz}
            onChange={(e) => onUpdate(item.id, 'jahresumsatz', formatNumberInput(e.target.value))}
            slotProps={{ input: { endAdornment: <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8' }}>EUR</Typography> } }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Mindestbeitrag (EUR)" value={item.mindestbeitrag}
            onChange={(e) => onUpdate(item.id, 'mindestbeitrag', formatNumberInput(e.target.value))}
            slotProps={{ input: { endAdornment: <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8' }}>EUR</Typography> } }} />
        </Grid>
      </Grid>

      {/* Calculated premium */}
      {umsatz > 0 && abs > 0 && (
        <Box sx={{ mt: 2.5, p: 2, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ABS</Typography>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#1D4ED8' }}>{abs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ‰</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nettobeitrag</Typography>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>{effNetto.toLocaleString('de-DE')} EUR</Typography>
            {mindest > 0 && netto < mindest && (
              <Typography sx={{ fontSize: '0.65rem', color: '#F59E0B' }}>Mindestbeitrag angewendet</Typography>
            )}
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Steuersatz</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <TextField size="small" value={item.steuersatz}
                onChange={(e) => onUpdate(item.id, 'steuersatz', e.target.value)}
                sx={{ width: 80, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.85rem', fontWeight: 700 } }}
                slotProps={{ input: { endAdornment: <Typography sx={{ fontSize: '0.78rem', color: '#64748B' }}>%</Typography> } }}
              />
            </Box>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bruttobeitrag</Typography>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>{brutto.toLocaleString('de-DE')} EUR</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

const Step5_Beitragskalkulation: React.FC<Props> = ({ data, onChange }) => {
  const abs = useMemo(() => calcVorschlagsbeitragssatz(data.risikokalkulation), [data.risikokalkulation]);
  const unternehmen = data.unternehmen;

  const updateU = (id: string, field: keyof Unternehmen, val: string) =>
    onChange({ unternehmen: unternehmen.map((u) => u.id === id ? { ...u, [field]: val } : u) });

  const deleteU = (id: string) =>
    onChange({ unternehmen: unternehmen.filter((u) => u.id !== id) });

  const addU = () =>
    onChange({
      unternehmen: [...unternehmen, {
        id: Date.now().toString(), risikobelegenheit: '',
        name: '', land: 'Deutschland', jahresumsatz: '', steuersatz: '19', mindestbeitrag: '',
      }],
    });

  const totals = useMemo(() => {
    let netto = 0;
    let brutto = 0;
    for (const u of unternehmen) {
      const umsatz = parseFormattedNumber(u.jahresumsatz);
      const steuer = parseFormattedNumber(u.steuersatz);
      const mindest = parseFormattedNumber(u.mindestbeitrag);
      const n = calcJahresnettobeitrag(umsatz, abs);
      const effN = mindest > 0 ? Math.max(n, mindest) : n;
      netto += effN;
      brutto += calcJahresbruttobeitrag(effN, steuer);
    }
    return { netto, brutto };
  }, [unternehmen, abs]);

  return (
    <Box>
      <Typography sx={{ color: '#64748B', fontSize: '0.85rem', mb: 3 }}>
        Erfassen Sie alle mitversicherten Unternehmen mit Jahresumsatz und Risikobelegenheit. Der Beitrag wird automatisch kalkuliert.
      </Typography>

      {!abs && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Bitte zuerst den Vorschlagsbeitragssatz in Schritt 4 (Risikokalkulation) hinterlegen.
        </Alert>
      )}

      {abs > 0 && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <EuroIcon sx={{ color: '#2563EB', fontSize: 18 }} />
          <Typography sx={{ fontSize: '0.82rem', color: '#1D4ED8', fontWeight: 600 }}>
            Vorschlagsbeitragssatz: <strong>{abs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ‰</strong> (aus Schritt 4)
          </Typography>
        </Box>
      )}

      <SectionCard icon={<EuroIcon sx={{ fontSize: 17 }} />} title="Beitragskalkulation" subtitle="Mitversicherte Unternehmen & Prämien" accent>
        {unternehmen.map((u, idx) => (
          <UnternehmenCard key={u.id} item={u} index={idx} abs={abs} canDelete={unternehmen.length > 1}
            onUpdate={updateU} onDelete={deleteU} />
        ))}

        <Button startIcon={<AddIcon />} variant="outlined" onClick={addU} fullWidth
          sx={{ mt: 1, textTransform: 'none', fontWeight: 600, borderStyle: 'dashed', py: 1.25 }}>
          Unternehmen hinzufügen
        </Button>
      </SectionCard>

      {/* Totals */}
      {totals.netto > 0 && (
        <Box sx={{ p: 3, bgcolor: '#0B1426', borderRadius: 3 }}>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2 }}>
            Gesamtprämie
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ color: '#60A5FA', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Netto gesamt</Typography>
              <Typography sx={{ color: '#F8FAFC', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {totals.netto.toLocaleString('de-DE')} EUR
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <Box>
              <Typography sx={{ color: '#94A3B8', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Brutto inkl. VSt.</Typography>
              <Typography sx={{ color: '#94A3B8', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {totals.brutto.toLocaleString('de-DE')} EUR
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Step5_Beitragskalkulation;
