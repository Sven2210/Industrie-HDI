import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Typography, Chip, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow,
  InputAdornment, Divider, Tooltip, MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import hdiLogo from '../assets/hdi-logo.webp';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { AntragData, VorgangStatus } from '../types/antrag';
import type { AppUser } from '../types/user';
import { kannBearbeiten, istEigenerVorgang, istZugewiesenerFreigeber } from '../utils/berechtigung';
import { STATUS_CONFIG } from '../utils/statusConfig';
import UserMenu from './UserMenu';

type MeinGrund = 'underwriter' | 'freigabe';

function meinGrund(user: AppUser, vorgang: AntragData): MeinGrund | null {
  if (istEigenerVorgang(user, vorgang)) return 'underwriter';
  if (istZugewiesenerFreigeber(user, vorgang)) return 'freigabe';
  return null;
}

const GRUND_LABELS: Record<MeinGrund, string> = {
  underwriter: 'Underwriter',
  freigabe: 'Zur Freigabe an mich',
};

interface Props {
  vorgaenge: AntragData[];
  currentUser: AppUser;
  users: AppUser[];
  onNewVorgang: () => void;
  onEditVorgang: (id: string) => void;
  onSwitchUser: (user: AppUser) => void;
  onLogout: () => void;
  onShowUebersicht?: () => void;
}

const SearchSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ mb: 3 }}>
    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.5 }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const VorgangsuchePage: React.FC<Props> = ({
  vorgaenge, currentUser, users, onNewVorgang, onEditVorgang, onSwitchUser, onLogout, onShowUebersicht,
}) => {
  const [searchVorgang, setSearchVorgang] = useState('');
  const [searchAnbahnungsnr, setSearchAnbahnungsnr] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searchUnderwriter, setSearchUnderwriter] = useState('');
  const [searchSparte, setSearchSparte] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchPlz, setSearchPlz] = useState('');
  const [searchOrt, setSearchOrt] = useState('');
  const [searchVPNr, setSearchVPNr] = useState('');
  const [searchVPName, setSearchVPName] = useState('');
  const [searchVPPlz, setSearchVPPlz] = useState('');
  const [searchVPOrt, setSearchVPOrt] = useState('');
  const [results, setResults] = useState<AntragData[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [ansicht, setAnsicht] = useState<'meine' | 'alle'>(currentUser.rolle === 'admin' ? 'alle' : 'meine');

  // Die Seite bleibt beim "User wechseln" gemountet — Standardansicht muss daher
  // pro Nutzer neu gesetzt werden, nicht nur beim ersten Rendern.
  useEffect(() => {
    setAnsicht(currentUser.rolle === 'admin' ? 'alle' : 'meine');
    setResults(null);
    setSearched(false);
  }, [currentUser.id]);

  const meineVorgaenge = vorgaenge.filter((v) => meinGrund(currentUser, v) !== null);
  const basisListe = ansicht === 'meine' ? meineVorgaenge : vorgaenge;

  const handleAnsichtWechsel = (neu: 'meine' | 'alle') => {
    setAnsicht(neu);
    setResults(null);
    setSearched(false);
  };

  const handleSearch = () => {
    let filtered = [...basisListe];
    const q = searchVorgang.toLowerCase();
    if (q) filtered = filtered.filter((v) =>
      v.vorgangsnr?.includes(q) ||
      v.interessent.name.toLowerCase().includes(q) ||
      (v.anbahnungsdaten.sparten ?? []).some((s) => s.sparte.toLowerCase().includes(q))
    );
    if (searchAnbahnungsnr) filtered = filtered.filter((v) => v.vorgangsnr?.includes(searchAnbahnungsnr));
    if (searchStatus) filtered = filtered.filter((v) => v.status === searchStatus);
    if (searchUnderwriter) filtered = filtered.filter((v) => v.underwriter?.toLowerCase().includes(searchUnderwriter.toLowerCase()));
    if (searchSparte) filtered = filtered.filter((v) => (v.anbahnungsdaten.sparten ?? []).some((s) => s.sparte.toLowerCase().includes(searchSparte.toLowerCase())));
    if (searchName) filtered = filtered.filter((v) => v.interessent.name.toLowerCase().includes(searchName.toLowerCase()));
    if (searchPlz) filtered = filtered.filter((v) => v.interessent.plz.includes(searchPlz));
    if (searchOrt) filtered = filtered.filter((v) => v.interessent.ort.toLowerCase().includes(searchOrt.toLowerCase()));
    if (searchVPNr) filtered = filtered.filter((v) => v.vertriebspartner.nummer.includes(searchVPNr));
    if (searchVPName) filtered = filtered.filter((v) => v.vertriebspartner.name.toLowerCase().includes(searchVPName.toLowerCase()));
    if (searchVPPlz) filtered = filtered.filter((v) => v.vertriebspartner.plz.includes(searchVPPlz));
    if (searchVPOrt) filtered = filtered.filter((v) => v.vertriebspartner.ort.toLowerCase().includes(searchVPOrt.toLowerCase()));
    setResults(filtered);
    setSearched(true);
  };

  const handleReset = () => {
    setSearchVorgang(''); setSearchAnbahnungsnr(''); setSearchStatus('');
    setSearchUnderwriter(''); setSearchSparte(''); setSearchName('');
    setSearchPlz(''); setSearchOrt(''); setSearchVPNr(''); setSearchVPName('');
    setSearchVPPlz(''); setSearchVPOrt(''); setResults(null); setSearched(false);
  };

  const displayList = results ?? [];
  const gezeigteListe = searched ? displayList : basisListe;

  const statusBreakdown = basisListe.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1;
    return acc;
  }, {} as Partial<Record<VorgangStatus, number>>);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F9', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <Box sx={{
        bgcolor: '#0A1F14', px: { xs: 3, md: 5 }, py: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 46, height: 36, borderRadius: '8px', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5, flexShrink: 0 }}>
            <Box component="img" src={hdiLogo} alt="HDI" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </Box>
          <Box>
            <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1 }}>
              <Box component="span" sx={{ color: '#7BC9A0' }}>TARIF</Box>rechner
            </Typography>
            <Typography sx={{ color: '#334155', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              INdustrieversicherung
            </Typography>
          </Box>
        </Box>
        <UserMenu currentUser={currentUser} users={users} onSwitchUser={onSwitchUser} onLogout={onLogout} onShowUebersicht={onShowUebersicht} dark />
      </Box>

      <Box sx={{ flex: 1, display: 'flex', p: { xs: 2, md: 4 }, gap: 3, maxWidth: 1400, mx: 'auto', width: '100%' }}>
        {/* Search panel */}
        <Box sx={{
          width: 300, flexShrink: 0, bgcolor: '#fff', borderRadius: 3, p: 3,
          border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
          height: 'fit-content', position: 'sticky', top: 80,
        }}>
          <Typography variant="h6" sx={{ mb: 0.5, fontSize: '1rem' }}>Vorgangssuche</Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.8rem', mb: 3 }}>Finden Sie bestehende Vorgänge</Typography>

          <SearchSection title="Suche nach Vorgang">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField size="small" fullWidth label="Anbahnungsnummer" value={searchAnbahnungsnr} onChange={(e) => setSearchAnbahnungsnr(e.target.value)} />
              <TextField size="small" fullWidth select label="Status" value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)}>
                <MenuItem value=""><em>Alle</em></MenuItem>
                <MenuItem value="entwurf">Entwurf</MenuItem>
                <MenuItem value="in Prüfung">In Prüfung</MenuItem>
                <MenuItem value="rückmeldung benötigt">Rückmeldung benötigt</MenuItem>
                <MenuItem value="aktiv">Aktiv</MenuItem>
                <MenuItem value="abgelehnt">Abgelehnt</MenuItem>
              </TextField>
              <TextField size="small" fullWidth label="Underwriter" value={searchUnderwriter} onChange={(e) => setSearchUnderwriter(e.target.value)} />
              <TextField size="small" fullWidth select label="Sparte" value={searchSparte} onChange={(e) => setSearchSparte(e.target.value)}>
                <MenuItem value=""><em>Alle</em></MenuItem>
                <MenuItem value="Haftpflicht">Haftpflicht</MenuItem>
                <MenuItem value="Transport">Transport</MenuItem>
                <MenuItem value="Technische Versicherung">Technische Versicherung</MenuItem>
              </TextField>
            </Box>
          </SearchSection>

          <Divider sx={{ my: 2 }} />
          <SearchSection title="Suche nach Kunde/Interessent">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField size="small" fullWidth label="Name" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField size="small" label="PLZ" value={searchPlz} onChange={(e) => setSearchPlz(e.target.value)} sx={{ width: 90 }} />
                <TextField size="small" fullWidth label="Ort" value={searchOrt} onChange={(e) => setSearchOrt(e.target.value)} />
              </Box>
            </Box>
          </SearchSection>

          <Divider sx={{ my: 2 }} />
          <SearchSection title="Suche nach Vertriebspartner">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField size="small" fullWidth label="Vertriebspartnernummer" value={searchVPNr} onChange={(e) => setSearchVPNr(e.target.value)} />
              <TextField size="small" fullWidth label="Name" value={searchVPName} onChange={(e) => setSearchVPName(e.target.value)} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField size="small" label="PLZ" value={searchVPPlz} onChange={(e) => setSearchVPPlz(e.target.value)} sx={{ width: 90 }} />
                <TextField size="small" fullWidth label="Ort" value={searchVPOrt} onChange={(e) => setSearchVPOrt(e.target.value)} />
              </Box>
            </Box>
          </SearchSection>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="contained" fullWidth startIcon={<SearchIcon />}
              onClick={handleSearch}
              sx={{ py: 1.2 }}
            >
              Suchen
            </Button>
            <Button
              variant="outlined" fullWidth startIcon={<RefreshIcon />}
              onClick={handleReset}
            >
              Zurücksetzen
            </Button>
          </Box>
        </Box>

        {/* Results area */}
        <Box sx={{ flex: 1 }}>
          {/* Action bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ mb: 0.5 }}>
                {searched ? `${displayList.length} Ergebnis${displayList.length !== 1 ? 'se' : ''}` : (ansicht === 'meine' ? 'Meine Vorgänge' : 'Alle Vorgänge')}
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: '0.82rem' }}>
                {searched ? 'Suchergebnisse' : `${basisListe.length} Vorgänge${ansicht === 'meine' ? ' zugeordnet' : ' insgesamt'}`}
              </Typography>
            </Box>
            <Button
              variant="contained" startIcon={<AddIcon />}
              onClick={onNewVorgang}
              sx={{ px: 2.5, py: 1.2 }}
            >
              Vorgang erfassen
            </Button>
          </Box>

          {/* Meine/Alle Toggle */}
          <Box sx={{ display: 'inline-flex', bgcolor: '#F1F5F9', borderRadius: 2.5, p: 0.4, mb: 2 }}>
            {(['meine', 'alle'] as const).map((v) => (
              <Box
                key={v}
                onClick={() => handleAnsichtWechsel(v)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer',
                  px: 2, py: 0.9, borderRadius: 2, transition: 'all 0.15s',
                  bgcolor: ansicht === v ? '#fff' : 'transparent',
                  boxShadow: ansicht === v ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
                }}
              >
                <Typography sx={{ fontSize: '0.78rem', fontWeight: ansicht === v ? 700 : 600, color: ansicht === v ? '#0F172A' : '#64748B' }}>
                  {v === 'meine' ? 'Meine Vorgänge' : 'Alle Vorgänge'}
                </Typography>
                <Chip
                  label={v === 'meine' ? meineVorgaenge.length : vorgaenge.length}
                  size="small"
                  sx={{
                    height: 18, fontSize: '0.65rem', fontWeight: 700,
                    bgcolor: ansicht === v ? '#00612C' : '#E2E8F0',
                    color: ansicht === v ? '#fff' : '#64748B',
                  }}
                />
              </Box>
            ))}
          </Box>

          {/* Status-Schnellüberblick */}
          {basisListe.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
              {(Object.keys(statusBreakdown) as VorgangStatus[]).map((status) => {
                const cfg = STATUS_CONFIG[status];
                return (
                  <Chip
                    key={status}
                    label={`${cfg.label} · ${statusBreakdown[status]}`}
                    size="small"
                    sx={{ fontSize: '0.7rem', fontWeight: 600, bgcolor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                  />
                );
              })}
            </Box>
          )}

          {/* Full-text search bar */}
          <TextField
            fullWidth
            placeholder="Schnellsuche nach Vorgangsnummer, Kunde, Sparte..."
            value={searchVorgang}
            onChange={(e) => setSearchVorgang(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment>,
              },
            }}
            sx={{ mb: 3 }}
          />

          {/* Results table */}
          <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
            {(!searched && basisListe.length === 0) ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <FolderOpenIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 2 }} />
                <Typography sx={{ color: '#64748B', fontWeight: 600, mb: 0.5 }}>
                  {ansicht === 'meine' ? 'Keine Vorgänge zugeordnet' : 'Noch keine Vorgänge'}
                </Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: '0.82rem' }}>
                  {ansicht === 'meine'
                    ? 'Ihnen sind aktuell keine Vorgänge als Underwriter zugeordnet oder zur Freigabe weitergeleitet.'
                    : 'Klicken Sie auf „Vorgang erfassen" für einen neuen Vorgang.'}
                </Typography>
              </Box>
            ) : (searched && displayList.length === 0) ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 2 }} />
                <Typography sx={{ color: '#64748B', fontWeight: 600 }}>Keine Ergebnisse gefunden</Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: '0.82rem', mt: 0.5 }}>
                  Versuchen Sie andere Suchbegriffe oder setzen Sie die Suche zurück.
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    {[
                      'Anbahnungsnr.', 'Status', 'Underwriter', 'Sparte', 'Kunde / Interessent', 'Vertriebspartner',
                      ...(ansicht === 'meine' ? ['Rolle'] : []),
                      'Aktionen',
                    ].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gezeigteListe.map((v) => {
                    const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.entwurf;
                    const bearbeitbar = kannBearbeiten(currentUser, v);
                    const grund = meinGrund(currentUser, v);
                    return (
                      <TableRow key={v.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background 0.1s', cursor: 'pointer' }} onClick={() => onEditVorgang(v.id)}>
                        <TableCell sx={{ py: 2 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>
                            {v.vorgangsnr || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Chip label={cfg.label} color={cfg.color} size="small" />
                            {!bearbeitbar && (
                              <Tooltip title="Nur Ansicht — fremder Vorgang">
                                <LockOutlinedIcon sx={{ fontSize: 15, color: '#CBD5E1' }} />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>
                            {v.underwriter || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {(v.anbahnungsdaten.sparten ?? []).filter(s => s.sparte).map((s) => (
                              <Typography key={s.id} sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                                {s.sparte}
                              </Typography>
                            ))}
                            {!(v.anbahnungsdaten.sparten ?? []).some(s => s.sparte) && (
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
                        {ansicht === 'meine' && (
                          <TableCell sx={{ py: 2 }}>
                            <Typography sx={{ fontSize: '0.78rem', color: grund === 'freigabe' ? '#004A21' : '#94A3B8', fontWeight: grund === 'freigabe' ? 600 : 400 }}>
                              {grund ? GRUND_LABELS[grund] : '—'}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell sx={{ py: 2 }} onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Anzeigen">
                              <IconButton size="small" onClick={() => onEditVorgang(v.id)} sx={{ color: '#64748B', '&:hover': { color: '#00612C', bgcolor: '#EAF5EE' } }}>
                                <VisibilityOutlinedIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={bearbeitbar ? 'Bearbeiten' : 'Nur Ansicht — fremder Vorgang'}>
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={!bearbeitbar}
                                  onClick={() => onEditVorgang(v.id)}
                                  sx={{ color: '#64748B', '&:hover': { color: '#00612C', bgcolor: '#EAF5EE' } }}
                                >
                                  <EditOutlinedIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default VorgangsuchePage;
