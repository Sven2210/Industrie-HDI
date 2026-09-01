import React from 'react';
import { Box, Typography, Avatar, Chip } from '@mui/material';
import hdiLogo from '../assets/hdi-logo.webp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { AppUser } from '../types/user';
import { ROLLE_LABELS } from '../types/user';

interface Props {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
}

const ROLLE_COLOR: Record<AppUser['rolle'], { bg: string; text: string }> = {
  nutzer: { bg: '#EAF5EE', text: '#00612C' },
  admin: { bg: '#FEF3C7', text: '#B45309' },
  spezialist: { bg: '#EDE9FE', text: '#5B21B6' },
};

const LoginPage: React.FC<Props> = ({ users, onLogin }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left brand panel */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 440,
          flexShrink: 0,
          bgcolor: '#0A1F14',
          p: 5,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decoration */}
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 80%, rgba(0, 97, 44,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(61,139,95,0.12) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 8 }}>
            <Box sx={{ width: 48, height: 38, borderRadius: '8px', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5, flexShrink: 0 }}>
              <Box component="img" src={hdiLogo} alt="HDI" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}>
                <Box component="span" sx={{ color: '#7BC9A0' }}>TARIF</Box>rechner
              </Typography>
              <Typography sx={{ color: '#475569', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                INdustrieversicherung
              </Typography>
            </Box>
          </Box>

          <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: '1.9rem', lineHeight: 1.2, letterSpacing: '-0.03em', mb: 2 }}>
            Professionelles<br />
            <Box component="span" sx={{ background: 'linear-gradient(90deg, #7BC9A0, #7BC9A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Underwriting
            </Box><br />
            auf einem Level.
          </Typography>
          <Typography sx={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Das interne Tarifierungssystem für Industrieversicherungen — schnell, präzise und vollständig digitalisiert.
          </Typography>
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {[
            { value: '5 Sparten', label: 'Industrieversicherung' },
            { value: '< 15 Min', label: 'bis zum fertigen Vorschlag' },
            { value: '100%', label: 'digital & auditierbar' },
          ].map((s) => (
            <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ width: 3, height: 20, borderRadius: 2, bgcolor: '#00612C', flexShrink: 0 }} />
              <Box>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2 }}>{s.value}</Typography>
                <Typography sx={{ color: '#475569', fontSize: '0.72rem' }}>{s.label}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right user picker panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#F1F5F9',
          p: { xs: 3, md: 6 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 440 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{ width: 46, height: 36, borderRadius: '8px', bgcolor: '#fff', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5, flexShrink: 0 }}>
              <Box component="img" src={hdiLogo} alt="HDI" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
              <Box component="span" sx={{ color: '#00612C' }}>TARIF</Box>rechner
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ mb: 0.5, color: '#0F172A' }}>
            Guten Tag!
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem', mb: 3.5 }}>
            Bitte wählen Sie Ihren Benutzer aus, um sich anzumelden.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {users.map((u) => {
              const c = ROLLE_COLOR[u.rolle];
              return (
                <Box
                  key={u.id}
                  onClick={() => onLogin(u)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 2, p: 1.75,
                    bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2.5,
                    cursor: 'pointer', transition: 'all 0.15s',
                    '&:hover': { borderColor: '#00612C', boxShadow: '0 2px 10px rgba(0, 97, 44,0.12)' },
                  }}
                >
                  <Avatar sx={{ width: 40, height: 40, bgcolor: '#1E3A8A', fontSize: '0.85rem', fontWeight: 700 }}>
                    {u.kuerzel}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                      {u.vorname} {u.nachname}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>{u.email}</Typography>
                  </Box>
                  <Chip
                    label={ROLLE_LABELS[u.rolle]}
                    size="small"
                    sx={{ bgcolor: c.bg, color: c.text, fontWeight: 700, fontSize: '0.68rem' }}
                  />
                  <ArrowForwardIcon sx={{ fontSize: 18, color: '#CBD5E1' }} />
                </Box>
              );
            })}
          </Box>

          <Box sx={{ mt: 3, p: 2, bgcolor: '#EAF5EE', border: '1px solid #D6EAE0', borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.72rem', color: '#3D8B5F', fontWeight: 600, mb: 0.5 }}>Demo-Modus</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#64748B' }}>
              Klicken Sie auf einen Benutzer, um sich ohne Passwort anzumelden. Nutzer sehen nur ihre eigenen Vorgänge zur Bearbeitung, Admins können alle Vorgänge bearbeiten.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
