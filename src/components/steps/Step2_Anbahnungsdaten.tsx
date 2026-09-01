import React from 'react';
import {
  Box, Grid, TextField, MenuItem, Typography, ToggleButtonGroup, ToggleButton,
  Button, IconButton, Chip,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WorkOutlineIcon from '@mui/icons-material/Work';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SectionCard from '../SectionCard';
import type { AntragData, Sparte, Zeichnungsart, SparteEntry } from '../../types/antrag';

const BETRIEBSARTEN: Record<Sparte, string[]> = {
  Haftpflicht: [
    'Metallverarbeitung / Maschinenbau', 'Lebensmittelherstellung', 'Chemische Industrie',
    'Textilproduktion', 'Elektronikherstl. / IT', 'Spedition / Logistik',
    'Hochbau', 'Tiefbau', 'Straßenbau', 'Luft- und Raumfahrt',
    'Kfz-Teile / Autoteile', 'Pharma & Medizintechnik',
    'Entsorgung / Recycling', 'Chemikalienhandel', 'Sonstige',
  ],
  Transport: [
    'Stückgut international', 'Sammelgut national', 'Kühlgut / Temperaturtransport',
    'Tankcontainer', 'Schwertransport', 'Gefahrgut ADR', 'Luftfracht', 'Seefracht',
  ],
  'Technische Versicherung': [
    'Maschinenmontage', 'Elektronikversicherung', 'Bauleistung (ABN/ABU)',
    'BU-Maschinen', 'Prüfmaschinen', 'Anlagenbau', 'Energieanlagen',
  ],
};

const SPARTE_COLORS: Record<Sparte, { bg: string; border: string; text: string; chip: string }> = {
  Haftpflicht:            { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', chip: '#DBEAFE' },
  Transport:              { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', chip: '#DCFCE7' },
  'Technische Versicherung': { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', chip: '#FFEDD5' },
};

interface Props {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
}

const SparteCard: React.FC<{
  entry: SparteEntry;
  index: number;
  canDelete: boolean;
  onUpdate: (id: string, field: keyof SparteEntry, val: string) => void;
  onDelete: (id: string) => void;
}> = ({ entry, index, canDelete, onUpdate, onDelete }) => {
  const betriebsarten = entry.sparte ? BETRIEBSARTEN[entry.sparte as Sparte] ?? [] : [];
  const colors = entry.sparte ? SPARTE_COLORS[entry.sparte as Sparte] : null;

  const handleSparteChange = (val: Sparte) => {
    onUpdate(entry.id, 'sparte', val);
    onUpdate(entry.id, 'betriebsart', ''); // reset Betriebsart on Sparte change
  };

  return (
    <Box
      sx={{
        p: 2.5,
        border: `1.5px solid ${colors ? colors.border : '#E2E8F0'}`,
        borderRadius: 2.5,
        mb: 2,
        bgcolor: colors ? colors.bg : '#FAFAFA',
        position: 'relative',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* Card header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 26, height: 26, borderRadius: '50%',
            bgcolor: colors ? colors.text : '#94A3B8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <WorkOutlineIcon sx={{ fontSize: 13, color: 'white' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>
            Sparte {index + 1}
            {entry.sparte && (
              <Box component="span" sx={{ color: '#64748B', fontWeight: 500 }}> · {entry.sparte}</Box>
            )}
          </Typography>
        </Box>
        {canDelete && (
          <IconButton
            size="small"
            onClick={() => onDelete(entry.id)}
            sx={{ color: '#FDA4AF', '&:hover': { color: '#EF4444' } }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 17 }} />
          </IconButton>
        )}
      </Box>

      {/* Sparte Toggle */}
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
          Sparte *
        </Typography>
        <ToggleButtonGroup
          value={entry.sparte}
          exclusive
          onChange={(_, v) => v && handleSparteChange(v as Sparte)}
          sx={{ flexWrap: 'wrap', gap: 0.75 }}
        >
          {(['Haftpflicht', 'Transport', 'Technische Versicherung'] as Sparte[]).map((s) => {
            const c = SPARTE_COLORS[s];
            return (
              <ToggleButton
                key={s} value={s}
                sx={{
                  border: `1.5px solid #E2E8F0 !important`,
                  borderRadius: '8px !important',
                  px: 2, py: 0.75,
                  fontSize: '0.8rem', fontWeight: 600, textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: `${c.bg} !important`,
                    borderColor: `${c.border} !important`,
                    color: c.text,
                  },
                }}
              >
                {s}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
        {entry.sparte && colors && (
          <Chip
            label={entry.sparte}
            size="small"
            sx={{ mt: 0.75, bgcolor: colors.chip, color: colors.text, fontSize: '0.68rem', border: `1px solid ${colors.border}`, fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Betriebsart */}
      <TextField
        fullWidth
        select
        size="small"
        label="Betriebsart *"
        value={entry.betriebsart}
        onChange={(e) => onUpdate(entry.id, 'betriebsart', e.target.value)}
        disabled={!entry.sparte}
      >
        <MenuItem value=""><em>— bitte auswählen —</em></MenuItem>
        {betriebsarten.map((b) => (
          <MenuItem key={b} value={b} sx={{ fontSize: '0.82rem' }}>{b}</MenuItem>
        ))}
      </TextField>
    </Box>
  );
};

const Step2_Anbahnungsdaten: React.FC<Props> = ({ data, onChange }) => {
  const ab = data.anbahnungsdaten;
  const sparten = ab.sparten ?? [{ id: '1', sparte: '' as const, betriebsart: '' }];

  const update = (field: string, value: string) =>
    onChange({ anbahnungsdaten: { ...ab, [field]: value } });

  const updateBeteilig = (field: string, value: string) =>
    onChange({ anbahnungsdaten: { ...ab, beteiligungsgeschaeft: { ...ab.beteiligungsgeschaeft, [field]: value } } });

  // Sparten handlers
  const updateSparte = (id: string, field: keyof SparteEntry, val: string) => {
    onChange({
      anbahnungsdaten: {
        ...ab,
        sparten: ab.sparten.map((s) => s.id === id ? { ...s, [field]: val } : s),
      },
    });
  };

  const deleteSparte = (id: string) => {
    onChange({
      anbahnungsdaten: { ...ab, sparten: ab.sparten.filter((s) => s.id !== id) },
    });
  };

  const addSparte = () => {
    onChange({
      anbahnungsdaten: {
        ...ab,
        sparten: [...ab.sparten, { id: Date.now().toString(), sparte: '', betriebsart: '' }],
      },
    });
  };

  return (
    <Box>
      <Typography sx={{ color: '#64748B', fontSize: '0.85rem', mb: 3 }}>
        Erfassen Sie die Anbahnungsdaten sowie Sparten, Betriebsarten und Zeichnungsart.
      </Typography>

      {/* Fristen & Laufzeit */}
      <SectionCard icon={<CalendarMonthIcon sx={{ fontSize: 17 }} />} title="Fristen & Laufzeit" subtitle="Terminliche Rahmendaten" accent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth required label="Eingangsdatum *" value={ab.eingangsdatum}
              onChange={(e) => update('eingangsdatum', e.target.value)} placeholder="TT.MM.JJJJ" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth required label="Anbahnungsfrist *" value={ab.anbahnungsfrist}
              onChange={(e) => update('anbahnungsfrist', e.target.value)} placeholder="TT.MM.JJJJ" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth required label="Vertragsbeginn *" value={ab.vertragsbeginn}
              onChange={(e) => update('vertragsbeginn', e.target.value)} placeholder="TT.MM.JJJJ" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth select required label="Laufzeit *" value={ab.laufzeit}
              onChange={(e) => update('laufzeit', e.target.value)}>
              <MenuItem value=""><em>— bitte auswählen —</em></MenuItem>
              {['1', '2', '3', '4', '5'].map((y) => (
                <MenuItem key={y} value={y}>{y} Jahr{y !== '1' ? 'e' : ''}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </SectionCard>

      {/* Sparten & Betriebsarten — multi-card */}
      <SectionCard icon={<WorkOutlineIcon sx={{ fontSize: 17 }} />} title="Sparte & Betriebsart" subtitle="Versicherungssparten und Tätigkeiten">

        {sparten.map((entry, idx) => (
          <SparteCard
            key={entry.id}
            entry={entry}
            index={idx}
            canDelete={sparten.length > 1}
            onUpdate={updateSparte}
            onDelete={deleteSparte}
          />
        ))}

        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={addSparte}
          fullWidth
          sx={{ mt: 1, textTransform: 'none', fontWeight: 600, borderStyle: 'dashed', py: 1.25 }}
        >
          Weitere Sparte hinzufügen
        </Button>

        {/* Betriebsbeschreibung — shared across all Sparten */}
        <Box sx={{ mt: 2.5 }}>
          <TextField
            fullWidth multiline rows={3}
            label="Betriebsbeschreibung *"
            value={ab.betriebsbeschreibung}
            onChange={(e) => update('betriebsbeschreibung', e.target.value)}
            placeholder="Beschreiben Sie die Haupttätigkeit des Unternehmens, Produkte/Dienstleistungen und besondere Risikomerkmale..."
          />
        </Box>
      </SectionCard>

      {/* Zeichnungsart */}
      <SectionCard icon={<AccountBalanceIcon sx={{ fontSize: 17 }} />} title="Zeichnungsart" subtitle="Alleinzeichnung oder Beteiligungsgeschäft">
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup value={ab.zeichnungsart} exclusive
            onChange={(_, v) => v && update('zeichnungsart', v as Zeichnungsart)}
            sx={{ gap: 1 }}>
            {(['Alleinzeichnung', 'Beteiligungsgeschäft'] as Zeichnungsart[]).map((z) => (
              <ToggleButton key={z} value={z}
                sx={{
                  border: '1.5px solid #E2E8F0 !important', borderRadius: '8px !important',
                  px: 2.5, py: 1, fontSize: '0.82rem', fontWeight: 600, textTransform: 'none',
                  '&.Mui-selected': { bgcolor: '#EFF6FF !important', borderColor: '#2563EB !important', color: '#1D4ED8' },
                }}>
                {z}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {ab.zeichnungsart === 'Beteiligungsgeschäft' && (
          <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Angaben Beteiligungsgeschäft
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField fullWidth required label="Anteil *" value={ab.beteiligungsgeschaeft.anteil}
                  onChange={(e) => updateBeteilig('anteil', e.target.value)}
                  slotProps={{ input: { endAdornment: <Typography sx={{ fontSize: '0.85rem', color: '#64748B' }}>%</Typography> } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField fullWidth required label="Name des Versicherers *" value={ab.beteiligungsgeschaeft.versichererName}
                  onChange={(e) => updateBeteilig('versichererName', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Unternehmenskennziffer" value={ab.beteiligungsgeschaeft.unternehmenskennziffer}
                  onChange={(e) => updateBeteilig('unternehmenskennziffer', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Führungsprovision" value={ab.beteiligungsgeschaeft.fuehrungsprovision}
                  onChange={(e) => updateBeteilig('fuehrungsprovision', e.target.value)}
                  slotProps={{ input: { endAdornment: <Typography sx={{ fontSize: '0.85rem', color: '#64748B' }}>%</Typography> } }} />
              </Grid>
            </Grid>
          </Box>
        )}
      </SectionCard>
    </Box>
  );
};

export default Step2_Anbahnungsdaten;
