import React, { useState } from 'react';
import {
  Box, Typography, Avatar, Menu, Chip, Divider, MenuItem,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import type { AppUser } from '../types/user';
import { ROLLE_LABELS } from '../types/user';

const ROLLE_COLOR: Record<AppUser['rolle'], { bg: string; text: string }> = {
  nutzer: { bg: '#EAF5EE', text: '#00612C' },
  admin: { bg: '#FEF3C7', text: '#B45309' },
  spezialist: { bg: '#EDE9FE', text: '#5B21B6' },
};

function RolleChip({ rolle }: { rolle: AppUser['rolle'] }) {
  const c = ROLLE_COLOR[rolle];
  return (
    <Chip
      label={ROLLE_LABELS[rolle]}
      size="small"
      sx={{ bgcolor: c.bg, color: c.text, fontWeight: 700, fontSize: '0.65rem', height: 20 }}
    />
  );
}

interface Props {
  currentUser: AppUser;
  users: AppUser[];
  onSwitchUser: (user: AppUser) => void;
  onLogout: () => void;
  onShowUebersicht?: () => void;
  dark?: boolean;
}

const UserMenu: React.FC<Props> = ({ currentUser, users, onSwitchUser, onLogout, onShowUebersicht, dark }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const andereUser = users.filter((u) => u.id !== currentUser.id);

  const handleSwitch = (user: AppUser) => {
    onSwitchUser(user);
    setAnchorEl(null);
  };

  const handleLogout = () => {
    setAnchorEl(null);
    onLogout();
  };

  const handleUebersicht = () => {
    setAnchorEl(null);
    onShowUebersicht?.();
  };

  return (
    <>
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer',
          px: 1, py: 0.5, borderRadius: 2, transition: 'background 0.15s',
          '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' },
        }}
      >
        <Avatar sx={{ width: 30, height: 30, bgcolor: '#1E3A8A', fontSize: '0.7rem', fontWeight: 700 }}>
          {currentUser.kuerzel}
        </Avatar>
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Typography sx={{ color: dark ? '#F8FAFC' : '#0F172A', fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.2 }}>
            {currentUser.vorname} {currentUser.nachname}
          </Typography>
          <Typography sx={{ color: dark ? '#94A3B8' : '#64748B', fontSize: '0.68rem' }}>
            {ROLLE_LABELS[currentUser.rolle]}
          </Typography>
        </Box>
      </Box>

      <Menu
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 300, borderRadius: 3, mt: 1 } } }}
      >
        {/* Aktueller User */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: '#1E3A8A', fontSize: '0.85rem', fontWeight: 700 }}>
            {currentUser.kuerzel}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
              {currentUser.vorname} {currentUser.nachname}
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser.email}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <RolleChip rolle={currentUser.rolle} />
            </Box>
          </Box>
        </Box>

        <Divider />

        {currentUser.rolle === 'admin' && onShowUebersicht && (
          <>
            <MenuItem onClick={handleUebersicht} sx={{ px: 2, py: 1.25, gap: 1.5 }}>
              <DashboardOutlinedIcon sx={{ fontSize: 18, color: '#B45309' }} />
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>
                Alle Vorgänge — Übersicht
              </Typography>
            </MenuItem>
            <Divider />
          </>
        )}

        {/* User wechseln */}
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            User wechseln
          </Typography>
        </Box>
        {andereUser.map((u) => (
          <MenuItem key={u.id} onClick={() => handleSwitch(u)} sx={{ px: 2, py: 1, gap: 1.5 }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: '#64748B', fontSize: '0.65rem', fontWeight: 700 }}>
              {u.kuerzel}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>
                {u.vorname} {u.nachname}
              </Typography>
            </Box>
            <RolleChip rolle={u.rolle} />
          </MenuItem>
        ))}

        <Divider sx={{ mt: 1 }} />

        <MenuItem onClick={handleLogout} sx={{ px: 2, py: 1.25, gap: 1.5, color: '#DC2626' }}>
          <LogoutIcon sx={{ fontSize: 18 }} />
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'inherit' }}>Abmelden</Typography>
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserMenu;
