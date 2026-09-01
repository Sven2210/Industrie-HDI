import React, { useState } from 'react';
import {
  Box, Button, Typography, Divider, Chip, Menu, MenuItem, useMediaQuery, useTheme,
  Dialog, DialogTitle, DialogActions, DialogContent, Snackbar, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import CalculateIcon from '@mui/icons-material/Calculate';
import EuroIcon from '@mui/icons-material/Euro';
import SummarizeIcon from '@mui/icons-material/Summarize';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';

import type { AntragData, VorgangStatus } from '../types/antrag';
import type { AppUser } from '../types/user';
import { STATUS_CONFIG } from '../utils/statusConfig';
import { verfuegbareUebergaenge, type StatusUebergang } from '../utils/statusUebergang';
import Step1_Interessent from './steps/Step1_Interessent';
import Step2_Anbahnungsdaten from './steps/Step2_Anbahnungsdaten';
import StepAnalyse from './steps/StepAnalyse';
import Step3_Risikocheck from './steps/Step3_Risikocheck';
import Step4_Risikokalkulation from './steps/Step4_Risikokalkulation';
import Step5_Beitragskalkulation from './steps/Step5_Beitragskalkulation';
import Step6_Zusammenfassung from './steps/Step6_Zusammenfassung';
import UserMenu from './UserMenu';
import hdiLogo from '../assets/hdi-logo.webp';

const STEPS = [
  { label: 'Interessent', sub: 'VN & Vertriebspartner', icon: <BusinessIcon sx={{ fontSize: 15 }} /> },
  { label: 'Anbahnungsdaten', sub: 'Sparte & Laufzeit', icon: <AssignmentIcon sx={{ fontSize: 15 }} /> },
  { label: 'Analyse', sub: 'Dokumentenprüfung', icon: <FactCheckOutlinedIcon sx={{ fontSize: 15 }} /> },
  { label: 'Risikocheck', sub: 'Haftpflicht-Risiken', icon: <GppMaybeIcon sx={{ fontSize: 15 }} /> },
  { label: 'Risikokalkulation', sub: 'WKZ & Beitragssatz', icon: <CalculateIcon sx={{ fontSize: 15 }} /> },
  { label: 'Beitragskalkulation', sub: 'Unternehmen & Prämien', icon: <EuroIcon sx={{ fontSize: 15 }} /> },
  { label: 'Zusammenfassung', sub: 'Prüfen & Vorschlag', icon: <SummarizeIcon sx={{ fontSize: 15 }} /> },
];

const SIDEBAR_W = 256;

interface StatusMenuProps {
  status: VorgangStatus;
  uebergaenge: StatusUebergang[];
  onSelect: (ziel: VorgangStatus) => void;
}

function StatusMenu({ status, uebergaenge, onSelect }: StatusMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const cfg = STATUS_CONFIG[status];
  const klickbar = uebergaenge.length > 0;

  return (
    <>
      <Box
        onClick={klickbar ? (e) => setAnchorEl(e.currentTarget) : undefined}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, cursor: klickbar ? 'pointer' : 'default' }}
      >
        <Chip
          label={cfg.label}
          size="small"
          sx={{ bgcolor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, fontWeight: 700, fontSize: '0.68rem' }}
        />
        {klickbar && <ExpandMoreIcon sx={{ fontSize: 15, color: cfg.text }} />}
      </Box>
      {klickbar && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          {uebergaenge.map((u) => (
            <MenuItem key={u.ziel} onClick={() => { onSelect(u.ziel); setAnchorEl(null); }}>
              {u.label}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}

interface Props {
  initialData: AntragData;
  currentUser: AppUser;
  users: AppUser[];
  readOnly: boolean;
  onSave: (data: AntragData) => void;
  onBack: () => void;
  onSwitchUser: (user: AppUser) => void;
  onLogout: () => void;
  onShowUebersicht?: () => void;
}

const AntragStepper: React.FC<Props> = ({
  initialData, currentUser, users, readOnly, onSave, onBack, onSwitchUser, onLogout, onShowUebersicht,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [step, setStep] = useState(0);
  const [data, setData] = useState<AntragData>(initialData);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [saveSnack, setSaveSnack] = useState(false);

  const update = (patch: Partial<AntragData>) => {
    if (readOnly) return;
    setData((d) => ({ ...d, ...patch, updatedAt: new Date().toISOString() }));
  };

  const goTo = (idx: number) => { setStep(idx); };

  const handleNext = () => { setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const handleBack = () => { setStep((s) => Math.max(s - 1, 0)); };

  const handleSave = () => {
    if (readOnly) return;
    const saved = { ...data, updatedAt: new Date().toISOString() };
    onSave(saved);
    setSaveSnack(true);
  };

  const statusUebergaenge = verfuegbareUebergaenge(data, currentUser);

  const handleStatusUebergang = (ziel: VorgangStatus) => {
    if (readOnly) return;
    const saved = { ...data, status: ziel, updatedAt: new Date().toISOString() };
    setData(saved);
    onSave(saved);
    setSaveSnack(true);
  };

  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  const renderStep = () => {
    switch (step) {
      case 0: return <Step1_Interessent data={data} onChange={update} />;
      case 1: return <Step2_Anbahnungsdaten data={data} onChange={update} />;
      case 2: return <StepAnalyse data={data} onChange={update} currentUser={currentUser} users={users} />;
      case 3: return <Step3_Risikocheck data={data} onChange={update} />;
      case 4: return <Step4_Risikokalkulation data={data} onChange={update} />;
      case 5: return <Step5_Beitragskalkulation data={data} onChange={update} />;
      case 6: return <Step6_Zusammenfassung data={data} onSave={handleSave} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#F1F5F9' }}>

      {/* Sidebar */}
      {!isMobile && (
        <Box sx={{
          width: SIDEBAR_W, flexShrink: 0, bgcolor: '#0A1F14',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 10,
        }}>
          {/* Brand */}
          <Box sx={{ px: 3, pt: 3.5, pb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 44, height: 34, borderRadius: '8px', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5, flexShrink: 0 }}>
                <Box component="img" src={hdiLogo} alt="HDI" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </Box>
              <Box>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.1 }}>
                  <Box component="span" sx={{ color: '#7BC9A0' }}>TARIF</Box>rechner
                </Typography>
                <Typography sx={{ color: '#334155', fontSize: '0.58rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  INdustrieversicherung
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mx: 2 }} />

          {/* Vorgang info */}
          <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
            {data.vorgangsnr ? (
              <Box sx={{ bgcolor: 'rgba(0, 97, 44,0.12)', border: '1px solid rgba(0, 97, 44,0.25)', borderRadius: 1.5, px: 1.5, py: 1 }}>
                <Typography sx={{ color: '#7BC9A0', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vorgang</Typography>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: '0.82rem', mb: 1 }}>{data.vorgangsnr}</Typography>
                <StatusMenu status={data.status} uebergaenge={statusUebergaenge} onSelect={handleStatusUebergang} />
              </Box>
            ) : (
              <Box>
                <Typography sx={{ color: '#334155', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', mb: 1 }}>
                  Neuer Vorgang
                </Typography>
                <StatusMenu status={data.status} uebergaenge={statusUebergaenge} onSelect={handleStatusUebergang} />
              </Box>
            )}
          </Box>

          {/* Steps */}
          <Box sx={{ px: 1.5, flex: 1, mt: 1, overflowY: 'auto' }}>
            {STEPS.map((s, idx) => {
              const active = idx === step;
              return (
                <Box key={s.label} onClick={() => goTo(idx)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    px: 1.5, py: 1.25, borderRadius: 2, cursor: 'pointer', mb: 0.5,
                    bgcolor: active ? 'rgba(0, 97, 44,0.15)' : 'transparent',
                    border: '1px solid', borderColor: active ? 'rgba(0, 97, 44,0.3)' : 'transparent',
                    transition: 'all 0.15s', position: 'relative',
                    '&:hover': !active ? { bgcolor: 'rgba(255,255,255,0.04)' } : {},
                  }}>
                  <Box sx={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.68rem', fontWeight: 700,
                    bgcolor: active ? '#00612C' : 'rgba(255,255,255,0.06)',
                    color: active ? 'white' : '#475569',
                    boxShadow: active ? '0 0 0 4px rgba(0, 97, 44,0.2)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {idx + 1}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: active ? 700 : 500, color: active ? '#F8FAFC' : '#475569', lineHeight: 1.2 }}>
                      {s.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: active ? '#7BC9A0' : '#334155', mt: 0.1 }}>
                      {s.sub}
                    </Typography>
                  </Box>
                  {active && <Box sx={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, borderRadius: '0 2px 2px 0', bgcolor: '#00612C' }} />}
                </Box>
              );
            })}
          </Box>

          {/* Progress */}
          <Box sx={{ px: 3, pb: 4 }}>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ color: '#475569', fontSize: '0.68rem', fontWeight: 600 }}>Fortschritt</Typography>
              <Typography sx={{ color: '#00612C', fontSize: '0.68rem', fontWeight: 700 }}>{progress}%</Typography>
            </Box>
            <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${progress}%`, borderRadius: 2, background: 'linear-gradient(90deg, #00612C, #3D8B5F)', transition: 'width 0.4s ease' }} />
            </Box>
          </Box>
        </Box>
      )}

      {/* Main */}
      <Box sx={{ flex: 1, ml: isMobile ? 0 : `${SIDEBAR_W}px`, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top bar */}
        <Box sx={{
          bgcolor: '#fff', borderBottom: '1px solid #E2E8F0',
          px: { xs: 2, md: 4 }, py: 1.75,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {isMobile && (
              <>
                <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#0A1F14', mr: 1 }}>
                  <Box component="span" sx={{ color: '#00612C' }}>TARIF</Box>rechner
                </Typography>
                <StatusMenu status={data.status} uebergaenge={statusUebergaenge} onSelect={handleStatusUebergang} />
              </>
            )}
            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: step === STEPS.length - 1 ? '#10B981' : '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: step === STEPS.length - 1 ? 'white' : '#00612C' }}>
              {React.cloneElement(STEPS[step].icon as React.ReactElement<{ sx: object }>, { sx: { fontSize: 14 } })}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', lineHeight: 1.2 }}>
                {STEPS[step].label}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>{STEPS[step].sub}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip label={`${step + 1} / ${STEPS.length}`} size="small" sx={{ bgcolor: '#EAF5EE', color: '#00612C', fontWeight: 700, fontSize: '0.7rem', border: '1px solid #D6EAE0', mr: 1 }} />
            <UserMenu currentUser={currentUser} users={users} onSwitchUser={onSwitchUser} onLogout={onLogout} onShowUebersicht={onShowUebersicht} />
          </Box>
        </Box>

        {/* Progress bar */}
        <Box sx={{ height: 3, bgcolor: '#E2E8F0' }}>
          <Box sx={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #00612C, #3D8B5F)', transition: 'width 0.3s ease' }} />
        </Box>

        {/* Read-only Hinweis */}
        {readOnly && (
          <Box sx={{
            bgcolor: '#FFFBEB', borderBottom: '1px solid #FDE68A',
            px: { xs: 2, md: 4 }, py: 1.25,
            display: 'flex', alignItems: 'center', gap: 1,
          }}>
            <LockOutlinedIcon sx={{ fontSize: 16, color: '#B45309' }} />
            <Typography sx={{ fontSize: '0.8rem', color: '#B45309', fontWeight: 600 }}>
              Nur Ansicht — dies ist ein fremder Vorgang. Änderungen können nicht gespeichert werden.
            </Typography>
          </Box>
        )}

        {/* Step content */}
        <Box sx={{ flex: 1, px: { xs: 2, md: 4 }, py: 4, maxWidth: 860, width: '100%', mx: 'auto' }}>
          <Box
            key={step}
            sx={{
              animation: 'fadeUp 0.22s ease',
              '@keyframes fadeUp': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
              ...(readOnly ? { pointerEvents: 'none', opacity: 0.75 } : {}),
            }}
          >
            {renderStep()}
          </Box>
        </Box>

        {/* Bottom nav */}
        <Box sx={{
          bgcolor: '#fff', borderTop: '1px solid #E2E8F0',
          px: { xs: 2, md: 4 }, py: 2.5,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', bottom: 0, zIndex: 5,
        }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => setLeaveDialog(true)} startIcon={<CloseIcon />} sx={{ color: '#64748B', borderColor: '#E2E8F0', minWidth: 100, '&:hover': { borderColor: '#94A3B8' } }}>
              Verlassen
            </Button>
          </Box>

          {/* Dots */}
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {STEPS.map((_, idx) => (
              <Box key={idx} onClick={() => goTo(idx)} sx={{
                width: idx === step ? 18 : 6, height: 6, borderRadius: 3, cursor: 'pointer',
                bgcolor: idx === step ? '#00612C' : '#E2E8F0',
                transition: 'all 0.25s',
              }} />
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack} disabled={step === 0} sx={{ minWidth: 100 }}>
              Zurück
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleNext} sx={{ minWidth: 100 }}>
                Weiter
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                onClick={handleSave}
                disabled={readOnly}
                sx={{ minWidth: 120, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
              >
                Speichern
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* Leave dialog */}
      <Dialog open={leaveDialog} onClose={() => setLeaveDialog(false)} slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Vorgang verlassen?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#64748B', fontSize: '0.88rem' }}>
            {readOnly ? 'Sie verlassen die Ansicht dieses Vorgangs.' : 'Möchten Sie den aktuellen Vorgang speichern?'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ gap: 1, pb: 2, px: 3 }}>
          <Button onClick={() => setLeaveDialog(false)} variant="outlined">Abbrechen</Button>
          {readOnly ? (
            <Button onClick={() => { setLeaveDialog(false); onBack(); }} variant="contained">Verlassen</Button>
          ) : (
            <>
              <Button onClick={() => { setLeaveDialog(false); onBack(); }} variant="outlined" color="error">Ohne Speichern verlassen</Button>
              <Button onClick={() => { handleSave(); setLeaveDialog(false); onBack(); }} variant="contained">Speichern & verlassen</Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={saveSnack} autoHideDuration={3000} onClose={() => setSaveSnack(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSaveSnack(false)} sx={{ fontWeight: 600 }}>
          Erfolgreich gespeichert!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AntragStepper;
