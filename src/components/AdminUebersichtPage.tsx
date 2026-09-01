import React, { useMemo } from 'react';
import {
  Box, Typography, Chip, IconButton, Tooltip,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FactoryIcon from '@mui/icons-material/Factory';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { AntragData, VorgangStatus } from '../types/antrag';
import type { AppUser } from '../types/user';
import { STATUS_CONFIG } from '../utils/statusConfig';
import UserMenu from './UserMenu';

const STATUS_REIHENFOLGE: VorgangStatus[] = ['entwurf', 'in Prüfung', 'rückmeldung benötigt', 'aktiv', 'abgelehnt'];

interface Props {
  vorgaenge: AntragData[];
  currentUser: AppUser;
  users: AppUser[];
  onBack: () => void;
  onEditVorgang: (id: string) => void;
  onSwitchUser: (user: AppUser) => void;
  onLogout: () => void;
}

const AdminUebersichtPage: React.FC<Props> = ({
  vorgaenge, currentUser, users, onBack, onEditVorgang, onSwitchUser, onLogout,
}) => {
  const nachStatus = useMemo(() => {
    const counts: Record<VorgangStatus, number> = { aktiv: 0, 'rückmeldung benötigt': 0, 'freigabe angefordert': 0, 'in Prüfung': 0, abgelehnt: 0, entwurf: 0 };
    vorgaenge.forEach((v) => { counts[v.status] = (counts[v.status] ?? 0) + 1; });
    return counts;
  }, [vorgaenge]);

  const nachUnderwriter = useMemo(() => {
    const counts = new Map<string, number>();
    vorgaenge.forEach((v) => {
      const key = v.underwriter || 'Nicht zugeordnet';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [vorgaenge]);

  const maxUnderwriterCount = Math.max(1, ...nachUnderwriter.map(([, c]) => c));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F9', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <Box sx={{
        bgcolor: '#0B1426', px: { xs: 3, md: 5 }, py: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #2563EB, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FactoryIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1 }}>
              <Box component="span" sx={{ color: '#60A5FA' }}>TARIF</Box>rechner
            </Typography>
            <Typography sx={{ color: '#334155', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              INdustrieversicherung
            </Typography>
          </Box>
        </Box>
        <UserMenu currentUser={currentUser} users={users} onSwitchUser={onSwitchUser} onLogout={onLogout} dark />
      </Box>

      <Box sx={{ flex: 1, p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto', width: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Tooltip title="Zurück zur Vorgangssuche">
            <IconButton onClick={onBack} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0' }}>
              <ArrowBackIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant="h5" sx={{ mb: 0.25 }}>Alle Vorgänge — Übersicht</Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.82rem' }}>
              Admin-Ansicht über alle Vorgänge im System, unabhängig vom zuständigen Underwriter
            </Typography>
          </Box>
        </Box>

        {/* KPI-Kacheln */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 2, mb: 3 }}>
          <Box sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 3, p: 2.5, boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AssignmentIcon sx={{ fontSize: 16, color: '#2563EB' }} />
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Gesamt
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>{vorgaenge.length}</Typography>
          </Box>
          {STATUS_REIHENFOLGE.map((status) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <Box key={status} sx={{ bgcolor: cfg.bg, border: `1px solid ${cfg.text}22`, borderRadius: 3, p: 2.5 }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: cfg.text, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
                  {cfg.label}
                </Typography>
                <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: cfg.text }}>{nachStatus[status]}</Typography>
              </Box>
            );
          })}
        </Box>

        {/* Verteilung nach Underwriter */}
        <Box sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 3, p: 3, mb: 3, boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PersonIcon sx={{ fontSize: 16, color: '#2563EB' }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Verteilung nach Underwriter
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {nachUnderwriter.map(([name, count]) => (
              <Box key={name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', width: 140, flexShrink: 0 }}>
                  {name}
                </Typography>
                <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: '#F1F5F9', overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${(count / maxUnderwriterCount) * 100}%`, bgcolor: '#2563EB', borderRadius: 4, transition: 'width 0.3s ease' }} />
                </Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563EB', width: 24, textAlign: 'right' }}>
                  {count}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Vollständige Liste */}
        <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                {['Anbahnungsnr.', 'Status', 'Underwriter', 'Sparte', 'Kunde / Interessent', 'Vertriebspartner', 'Aktionen'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {vorgaenge.map((v) => {
                const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.entwurf;
                return (
                  <TableRow key={v.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background 0.1s', cursor: 'pointer' }} onClick={() => onEditVorgang(v.id)}>
                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>
                        {v.vorgangsnr || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip label={cfg.label} color={cfg.color} size="small" />
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>
                        {v.underwriter || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {(v.anbahnungsdaten.sparten ?? []).filter((s) => s.sparte).map((s) => (
                          <Typography key={s.id} sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                            {s.sparte}
                          </Typography>
                        ))}
                        {!(v.anbahnungsdaten.sparten ?? []).some((s) => s.sparte) && (
                          <Typography sx={{ fontSize: '0.82rem', color: '#94A3B8' }}>—</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>
                        {v.interessent.name}{v.interessent.firmierung ? ` ${v.interessent.firmierung}` : ''}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                        {v.interessent.strasse} {v.interessent.hausnummer}, {v.interessent.plz} {v.interessent.ort}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>
                        {v.vertriebspartner.name || '—'}
                      </Typography>
                      {v.vertriebspartner.nummer && (
                        <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>Nr. {v.vertriebspartner.nummer}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 2 }} onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Anzeigen">
                          <IconButton size="small" onClick={() => onEditVorgang(v.id)} sx={{ color: '#64748B', '&:hover': { color: '#2563EB', bgcolor: '#EFF6FF' } }}>
                            <VisibilityOutlinedIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Bearbeiten">
                          <IconButton size="small" onClick={() => onEditVorgang(v.id)} sx={{ color: '#64748B', '&:hover': { color: '#2563EB', bgcolor: '#EFF6FF' } }}>
                            <EditOutlinedIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminUebersichtPage;
