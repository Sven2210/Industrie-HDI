import React from 'react';
import { Box, Grid, TextField, MenuItem, Typography } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SectionCard from '../SectionCard';
import type { AntragData, Firmierung } from '../../types/antrag';

const EUROPA_LAENDER = [
  'Deutschland', 'Österreich', 'Schweiz', 'Frankreich', 'Italien', 'Spanien', 'Portugal',
  'Niederlande', 'Belgien', 'Luxemburg', 'Polen', 'Tschechien', 'Slowakei', 'Ungarn',
  'Rumänien', 'Bulgarien', 'Kroatien', 'Slowenien', 'Serbien', 'Griechenland',
  'Dänemark', 'Schweden', 'Norwegen', 'Finnland', 'Estland', 'Lettland', 'Litauen',
  'Irland', 'Vereinigtes Königreich', 'Türkei', 'Ukraine',
];

const FIRMIERUNGEN: Firmierung[] = ['GbR', 'OHG', 'KG', 'GmbH', 'UG', 'AG', 'Limited', 'SE'];

interface Props {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
}

const Step1_Interessent: React.FC<Props> = ({ data, onChange }) => {
  const vn = data.interessent;
  const vp = data.vertriebspartner;
  const wa = data.wagnisanschrift;

  const updateVN = (field: string, value: string) =>
    onChange({ interessent: { ...vn, [field]: value } });

  const updateWA = (field: string, value: string) =>
    onChange({ wagnisanschrift: { ...wa, [field]: value } });

  const updateVNAP = (field: string, value: string) =>
    onChange({ interessent: { ...vn, ansprechpartner: { ...vn.ansprechpartner, [field]: value } } });

  const updateVP = (field: string, value: string) =>
    onChange({ vertriebspartner: { ...vp, [field]: value } });

  const updateVPAP = (field: string, value: string) =>
    onChange({ vertriebspartner: { ...vp, ansprechpartner: { ...vp.ansprechpartner, [field]: value } } });

  return (
    <Box>
      <Typography sx={{ color: '#64748B', fontSize: '0.85rem', mb: 3 }}>
        Erfassen Sie die Stammdaten des Versicherungsnehmers und des Vertriebspartners.
      </Typography>

      {/* Interessent */}
      <SectionCard icon={<BusinessIcon sx={{ fontSize: 17 }} />} title="Interessent" subtitle="Versicherungsnehmer / Antragsteller" accent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth required label="Name *" value={vn.name} onChange={(e) => updateVN('name', e.target.value)} placeholder="Unternehmensname" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth select required label="Firmierung *" value={vn.firmierung} onChange={(e) => updateVN('firmierung', e.target.value)}>
              <MenuItem value=""><em>— bitte auswählen —</em></MenuItem>
              {FIRMIERUNGEN.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField fullWidth required label="Straße *" value={vn.strasse} onChange={(e) => updateVN('strasse', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField fullWidth required label="Nr. *" value={vn.hausnummer} onChange={(e) => updateVN('hausnummer', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField fullWidth required label="PLZ *" value={vn.plz} onChange={(e) => updateVN('plz', e.target.value)} slotProps={{ htmlInput: { maxLength: 10 } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth required label="Ort *" value={vn.ort} onChange={(e) => updateVN('ort', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Adresszusatz" value={vn.adresszusatz} onChange={(e) => updateVN('adresszusatz', e.target.value)} />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <PersonOutlineIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ansprechpartner des Interessenten
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth size="small" label="Name" value={vn.ansprechpartner.name} onChange={(e) => updateVNAP('name', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth size="small" label="Vorname" value={vn.ansprechpartner.vorname} onChange={(e) => updateVNAP('vorname', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth size="small" label="E-Mail" type="email" value={vn.ansprechpartner.email} onChange={(e) => updateVNAP('email', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth size="small" label="Telefon" value={vn.ansprechpartner.telefon} onChange={(e) => updateVNAP('telefon', e.target.value)} />
            </Grid>
          </Grid>
        </Box>
      </SectionCard>

      {/* Wagnisanschrift */}
      <SectionCard icon={<LocationOnIcon sx={{ fontSize: 17 }} />} title="Wagnisanschrift" subtitle="Standort des versicherten Objekts / Risikos">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField fullWidth required label="Straße *" value={wa.strasse} onChange={(e) => updateWA('strasse', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField fullWidth required label="Nr. *" value={wa.hausnummer} onChange={(e) => updateWA('hausnummer', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField fullWidth required label="PLZ *" value={wa.plz} onChange={(e) => updateWA('plz', e.target.value)} slotProps={{ htmlInput: { maxLength: 10 } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth required label="Ort *" value={wa.ort} onChange={(e) => updateWA('ort', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth select required label="Land *" value={wa.land} onChange={(e) => updateWA('land', e.target.value)}>
              {EUROPA_LAENDER.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
      </SectionCard>

      {/* Vertriebspartner */}
      <SectionCard icon={<GroupsIcon sx={{ fontSize: 17 }} />} title="Vertriebspartner" subtitle="Vermittler / Makler">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField fullWidth required label="Name *" value={vp.name} onChange={(e) => updateVP('name', e.target.value)} placeholder="Maklerfirma" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth select required label="Firmierung *" value={vp.firmierung} onChange={(e) => updateVP('firmierung', e.target.value)}>
              <MenuItem value=""><em>— bitte auswählen —</em></MenuItem>
              {FIRMIERUNGEN.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField fullWidth required label="VP-Nummer *" value={vp.nummer} onChange={(e) => updateVP('nummer', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField fullWidth required label="Straße *" value={vp.strasse} onChange={(e) => updateVP('strasse', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField fullWidth required label="Nr. *" value={vp.hausnummer} onChange={(e) => updateVP('hausnummer', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField fullWidth required label="PLZ *" value={vp.plz} onChange={(e) => updateVP('plz', e.target.value)} slotProps={{ htmlInput: { maxLength: 10 } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth required label="Ort *" value={vp.ort} onChange={(e) => updateVP('ort', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Adresszusatz" value={vp.adresszusatz} onChange={(e) => updateVP('adresszusatz', e.target.value)} />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <PersonOutlineIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ansprechpartner des Vertriebspartners
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth size="small" label="Name" value={vp.ansprechpartner.name} onChange={(e) => updateVPAP('name', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth size="small" label="Vorname" value={vp.ansprechpartner.vorname} onChange={(e) => updateVPAP('vorname', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth size="small" label="E-Mail" type="email" value={vp.ansprechpartner.email} onChange={(e) => updateVPAP('email', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth size="small" label="Telefon" value={vp.ansprechpartner.telefon} onChange={(e) => updateVPAP('telefon', e.target.value)} />
            </Grid>
          </Grid>
        </Box>
      </SectionCard>
    </Box>
  );
};

export default Step1_Interessent;
