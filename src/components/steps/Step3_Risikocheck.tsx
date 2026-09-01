import React, { useState } from 'react';
import {
  Box, Typography, ToggleButtonGroup, ToggleButton, TextField,
  Button, IconButton, Chip, Divider, Collapse,
} from '@mui/material';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import NaturePeopleIcon from '@mui/icons-material/NaturePeople';
import GavelIcon from '@mui/icons-material/Gavel';
import AddIcon from '@mui/icons-material/Add';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SectionCard from '../SectionCard';
import RisikoAnalysePanel from '../RisikoAnalysePanel';
import SanktionsPruefPanel from '../SanktionsPruefPanel';
import type { AntragData, RisikocheckItem, RisikoRelevanz } from '../../types/antrag';

interface Props {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
}

const RELEVANZ_COLORS: Record<RisikoRelevanz, { bg: string; text: string; border: string }> = {
  niedrig: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  hoch: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  nein: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  ja: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  'nicht vereinbart': { bg: '#F8FAFC', text: '#94A3B8', border: '#E2E8F0' },
  '': { bg: '#F8FAFC', text: '#94A3B8', border: '#E2E8F0' },
};

const RisikoRow: React.FC<{
  item: RisikocheckItem;
  onUpdate: (id: string, field: 'value' | 'anmerkungen', val: string) => void;
  onDelete?: (id: string) => void;
}> = ({ item, onUpdate, onDelete }) => {
  const [showNote, setShowNote] = useState(!!item.anmerkungen);
  const colors = RELEVANZ_COLORS[item.value];

  return (
    <Box sx={{ py: 1.5, borderBottom: '1px solid #F1F5F9', '&:last-child': { borderBottom: 'none' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {/* Label */}
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>
            {item.label}
          </Typography>
        </Box>

        {/* Toggle options */}
        <ToggleButtonGroup value={item.value} exclusive onChange={(_, v) => v && onUpdate(item.id, 'value', v)} size="small">
          {item.options.map((opt) => {
            const c = RELEVANZ_COLORS[opt];
            return (
              <ToggleButton key={opt} value={opt}
                sx={{
                  border: `1.5px solid ${item.value === opt ? c.border : '#E2E8F0'} !important`,
                  borderRadius: '6px !important',
                  mx: '2px !important',
                  px: 1.5, py: 0.5,
                  fontSize: '0.72rem', fontWeight: 600, textTransform: 'none',
                  bgcolor: item.value === opt ? `${c.bg} !important` : 'transparent',
                  color: item.value === opt ? `${c.text} !important` : '#94A3B8',
                  transition: 'all 0.15s',
                }}>
                {opt}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>

        {/* Current value chip */}
        <Chip
          label={item.value}
          size="small"
          sx={{
            bgcolor: colors.bg, color: colors.text,
            border: `1px solid ${colors.border}`,
            fontSize: '0.68rem', fontWeight: 700, minWidth: 90,
          }}
        />

        {/* Note toggle */}
        <IconButton size="small" onClick={() => setShowNote(!showNote)}
          sx={{ color: item.anmerkungen ? '#00612C' : '#CBD5E1', '&:hover': { color: '#00612C' } }}>
          <EditNoteIcon sx={{ fontSize: 18 }} />
        </IconButton>

        {item.isCustom && onDelete && (
          <IconButton size="small" onClick={() => onDelete(item.id)} sx={{ color: '#FDA4AF', '&:hover': { color: '#EF4444' } }}>
            <DeleteOutlineIcon sx={{ fontSize: 17 }} />
          </IconButton>
        )}
      </Box>

      {/* Anmerkungen */}
      <Collapse in={showNote}>
        <TextField
          fullWidth multiline rows={2} size="small"
          placeholder="Anmerkungen zum Risiko..."
          value={item.anmerkungen}
          onChange={(e) => onUpdate(item.id, 'anmerkungen', e.target.value)}
          sx={{ mt: 1.5, ml: { sm: 0 }, '& .MuiOutlinedInput-root': { bgcolor: '#FAFAFA' } }}
        />
      </Collapse>
    </Box>
  );
};

const Step3_Risikocheck: React.FC<Props> = ({ data, onChange }) => {
  const items = data.risikocheck;

  const updateItem = (id: string, field: 'value' | 'anmerkungen', val: string) => {
    onChange({
      risikocheck: items.map((i) => i.id === id ? { ...i, [field]: val } : i),
    });
  };

  const deleteItem = (id: string) => {
    onChange({ risikocheck: items.filter((i) => i.id !== id) });
  };

  const addCustomRisk = () => {
    const newId = `custom-${Date.now()}`;
    onChange({
      risikocheck: [...items, {
        id: newId, label: 'Sonstiges Risiko',
        options: ['nein', 'ja'] as RisikoRelevanz[],
        value: '' as RisikoRelevanz,
        anmerkungen: '', isCustom: true,
      }],
    });
  };

  const mainItems = items.filter((i) => !i.isCompliance);
  const complianceItems = items.filter((i) => i.isCompliance);

  return (
    <Box>
      <Typography sx={{ color: '#64748B', fontSize: '0.85rem', mb: 3 }}>
        Bewerten Sie alle relevanten Risikofaktoren für die Haftpflichtversicherung und fügen Sie ggf. Anmerkungen hinzu.
      </Typography>

      {/* Standortrisikoanalyse */}
      <SectionCard icon={<NaturePeopleIcon sx={{ fontSize: 17 }} />} title="Standortrisikoanalyse" subtitle="Automatische Bewertung der Naturgefahren an der Wagnisanschrift" accent>
        <RisikoAnalysePanel data={data} onChange={onChange} />
      </SectionCard>

      {/* Sanktionsprüfung */}
      <SectionCard
        icon={<GavelIcon sx={{ fontSize: 17 }} />}
        title="Sanktionsprüfung"
        subtitle="Automatischer Abgleich mit EU-Sanktionsliste und UN Security Council"
        accent
      >
        <SanktionsPruefPanel data={data} onChange={onChange} />
      </SectionCard>

      {/* Main risk factors */}
      <SectionCard icon={<GppMaybeIcon sx={{ fontSize: 17 }} />} title="Risikocheck" subtitle="Bewertung der Tarifierungsmerkmale" accent>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 1, pb: 1, borderBottom: '2px solid #E2E8F0' }}>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Merkmal</Typography>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Relevanz</Typography>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</Typography>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notiz</Typography>
          </Box>
        </Box>

        {mainItems.map((item) => (
          <RisikoRow key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} />
        ))}

        <Button
          startIcon={<AddIcon />}
          size="small"
          onClick={addCustomRisk}
          sx={{ mt: 2, color: '#00612C', fontWeight: 600, fontSize: '0.8rem', textTransform: 'none' }}
        >
          Risiko hinzufügen
        </Button>
      </SectionCard>

      {/* Compliance */}
      <SectionCard icon={<VerifiedUserIcon sx={{ fontSize: 17 }} />} title="Compliance & Sonderprüfungen" subtitle="Pflichtfelder vor Vorschlagserstellung">
        <Divider sx={{ mb: 0 }} />
        {complianceItems.map((item) => (
          <RisikoRow key={item.id} item={item} onUpdate={updateItem} />
        ))}
      </SectionCard>
    </Box>
  );
};

export default Step3_Risikocheck;
